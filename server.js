import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const ORS_API_KEY = process.env.ORS_API_KEY;

app.disable("x-powered-by");
// Replit serves the app behind one trusted reverse proxy and embeds its preview.
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, frameguard: false }));
app.use(express.json({ limit: "30kb" }));
app.use("/api/", rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (_req, res) => {
  res.json({ ok: true, routingConfigured: Boolean(ORS_API_KEY), provider: "OpenRouteService", version: "1.0.0" });
});

app.post("/api/route", async (req, res) => {
  if (!ORS_API_KEY) return res.status(503).json({ error: "Chybí ORS_API_KEY na serveru. Viz README." });
  const { start, mode = "loop", distanceKm = 5, surface = "mixed", maxAscentM = 150 } = req.body ?? {};
  if (!start || !Number.isFinite(start.lat) || !Number.isFinite(start.lon) ||
      start.lat < 48.0 || start.lat > 51.2 || start.lon < 12.0 || start.lon > 19.0) {
    return res.status(400).json({ error: "Zadej platnou polohu v České republice." });
  }
  if (!Number.isFinite(distanceKm) || distanceKm < 1 || distanceKm > 40) {
    return res.status(400).json({ error: "Vzdálenost musí být 1–40 km." });
  }
  if (!["loop", "ab"].includes(mode)) return res.status(400).json({ error: "Neznámý typ trasy." });

  try {
    let route;
   if (mode === "loop") {
  let bestRoute = null;
  let bestDifferenceM = Infinity;
  const targetM = Math.round(distanceKm * 1000);

  for (let attempt = 0; attempt < 5; attempt++) {
    const body = {
      coordinates: [[start.lon, start.lat]],
      options: {
        round_trip: {
          length: targetM,
          points: [4, 6, 8, 5, 7][attempt],
          seed: Math.floor(Math.random() * 1000000)
        }
      },
      units: "m",
      elevation: true,
      instructions: true
    };

    const candidate = await orsRequest(
      "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
      body
    );

    const candidateDistance = Number(
      candidate.features?.[0]?.properties?.summary?.distance ?? 0
    );

    const differenceM = Math.abs(candidateDistance - targetM);

    if (candidateDistance > 0 && differenceM < bestDifferenceM) {
      bestRoute = candidate;
      bestDifferenceM = differenceM;
    }

    if (bestDifferenceM <= targetM * 0.05) {
      break;
    }
  }

  if (!bestRoute) {
    throw new Error("Nepodařilo se najít použitelný okruh. Zkus to znovu.");
  }

  route = bestRoute;
    } else {
      // A–B: generate a practical destination east/north of start; ORS snaps both points to routable foot paths.
      const latOffset = (distanceKm * 0.0065) / 1.11;
      const lonOffset = (distanceKm * 0.0065) / (1.11 * Math.cos(start.lat * Math.PI / 180));
      const destination = [start.lon + lonOffset, start.lat + latOffset];
      const body = { coordinates: [[start.lon, start.lat], destination], elevation: true, instructions: true, units: "m" };
      route = await orsRequest("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", body);
    }

    const feature = route.features?.[0];
    const coords = feature?.geometry?.coordinates;
    if (!feature || !Array.isArray(coords) || coords.length < 2) {
      return res.status(502).json({ error: "Routingová služba nevrátila použitelnou trasu. Zkus jiný start nebo vzdálenost." });
    }
    const summary = feature.properties?.summary ?? {};
    const actualDistanceKm = Number(summary.distance ?? 0) / 1000;
const differencePct = Math.abs((actualDistanceKm - distanceKm) / distanceKm * 100);

if (differencePct > 20) {
  return res.status(422).json({
    error: `Podařilo se najít trasu dlouhou ${actualDistanceKm.toFixed(2)} km, ale požadováno bylo ${distanceKm} km. Zkus to prosím znovu nebo změň výchozí místo.`
  });
}
    const segments = feature.properties?.segments ?? [];
    const ascent = Number(summary.ascent ?? 0);
    const descent = Number(summary.descent ?? 0);
    const surfaces = inferSurfaces(segments, surface);
    const result = {
      type: mode,
      geometry: coords,
      distanceM: Number(summary.distance ?? 0),
      durationS: Number(summary.duration ?? 0),
      ascentM: ascent,
      descentM: descent,
      requestedDistanceKm: distanceKm,
      distanceDifferencePct: Math.abs((Number(summary.distance ?? 0) / 1000 - distanceKm) / distanceKm * 100),
      surfaceEstimate: surfaces,
      warning: "Trasa je vypočtená routovací službou. Povrch a převýšení jsou odhady podle dostupných dat; před během zkontroluj uzavírky, průchodnost a místní značení.",
      attribution: "© OpenStreetMap contributors · routing OpenRouteService"
    };
    if (ascent > maxAscentM) result.ascentWarning = `Trasa má přibližně ${Math.round(ascent)} m stoupání, více než zadaný limit ${maxAscentM} m.`;
    res.json(result);
  } catch (error) {
    const status = error.status || 502;
    res.status(status).json({ error: error.message || "Trasu se nepodařilo spočítat. Zkus to znovu." });
  }
});

async function orsRequest(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json", Accept: "application/geo+json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error?.message || data.error || `Routingová služba odpověděla chybou (${response.status}).`;
    const err = new Error(typeof message === "string" ? message : "Chyba routování.");
    err.status = response.status === 429 ? 429 : 502;
    throw err;
  }
  return data;
}

function inferSurfaces(_segments, preference) {
  // ORS foot-walking response does not guarantee a complete per-edge surface classification.
  // Never fabricate percentages; explicitly mark surface breakdown as unavailable.
  return {
    preferenceRequested: preference,
    breakdownAvailable: false,
    message: "Přesný podíl asfaltu, šotoliny a pěšin vyžaduje samostatnou analýzu OSM tagů; zde není předstírán."
  };
}

app.get("*catchall", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, "0.0.0.0", () => console.log(`RunMyRoute běží na portu ${PORT}`));
