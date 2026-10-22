# RunMyRoute — nasaditelná první verze

Tato složka obsahuje skutečný základ webové aplikace/PWA, nikoli jen statický obrázek. Používá OpenStreetMap pro mapu a OpenRouteService pro výpočet pěších tras.

## Co už je implementované
- Responzivní webové rozhraní pro desktop i mobil.
- Interaktivní mapa OpenStreetMap s atribucí.
- Start z GPS polohy (s oprávněním prohlížeče) nebo kliknutím do mapy.
- Požadovaná délka, okruh/A–B a preference povrchu.
- Serverový endpoint pro OpenRouteService; API klíč se neposílá do prohlížeče.
- Skutečná geometrie routovací služby, zobrazení vypočtené délky/času a výškových údajů, pokud je služba vrátí.
- GPX export pouze po úspěšném routingu.
- Základní bezpečnostní hlavičky a rate limit.

## Co není hotové / co neslibovat
- Preferovaný povrch je zatím zaznamenán, ale nefiltruje cestu podle jednotlivých OSM `surface` tagů.
- Převýšení vychází z dat routovací služby a není nezávisle validováno proti digitálnímu modelu terénu.
- Okruh je generovaný routovací službou; skutečná délka se může od požadované lišit.
- A–B režim navrhne orientační cíl podle vzdálenosti, takže délka trasy nemusí odpovídat přesně cíli.
- Žádná garance aktuální průchodnosti, otevíracích dob, uzavírek či bezpečnosti.
- Není to nativní iOS aplikace ani ještě publikovaná služba.
- PWA offline režim cachuje jen základní shell; mapa a routing potřebují internet.

## Spuštění lokálně
1. Nainstaluj Node.js 20 nebo novější.
2. V této složce spusť `npm install`.
3. Zkopíruj `.env.example` do `.env` a vlož svůj klíč do `ORS_API_KEY`.
4. Spusť `npm start`.
5. Otevři `http://localhost:3000`. GPS funguje v localhost; v nasazení vyžaduje HTTPS.

## Získání API klíče
1. Otevři https://openrouteservice.org/dev/#/signup
2. Založ účet a vytvoř API key pro Directions.
3. Skutečný klíč nikam neposílej do chatu a nevkládej do `public/` ani do GitHubu.
4. Na hostingu nastav `ORS_API_KEY` v sekci Environment Variables / Secrets.

## Nasazení na Render
1. Nahraj projekt do vlastního GitHub repozitáře.
2. V Render zvol New → Blueprint a připoj repozitář, ve kterém je `render.yaml`.
3. Potvrď vytvoření webové služby.
4. Do nastavení služby přidej `ORS_API_KEY` jako tajnou environment proměnnou.
5. Deployni a otestuj `/api/status`. `routingConfigured` musí být `true`.
6. Otevři HTTPS URL na iPhonu; přes Sdílet → Přidat na plochu ji můžeš používat podobně jako aplikaci.

Poznámka: bezplatné tarify hostingů, limity API a podmínky se mohou měnit. Zkontroluj aktuální limity před používáním. Uživatel si API klíč spravuje sám a musí dodržet podmínky poskytovatele.

## Další důležité kroky před veřejným spuštěním
- Otestovat ORS API s platným klíčem v místě použití.
- Přidat analýzu povrchu z OSM segmentů (surface, highway, access, foot, tracktype) a vyloučit zakázané cesty.
- Pro přesné převýšení přidat DEM/elevation zdroj a ověřit jeho licenci.
- Přidat ochranu proti zneužití, limity a monitoring.
- Otestovat okruhy, A–B, GPX, GPS a různé mobilní prohlížeče.
- Pokud má vzniknout nativní aplikace App Store, připravit následně iOS obal nebo samostatnou aplikaci a projít App Store Review.

## Licence a mapové podklady
Mapová data © OpenStreetMap contributors, licence ODbL: https://www.openstreetmap.org/copyright. Routing zajišťuje OpenRouteService dle jeho podmínek.
