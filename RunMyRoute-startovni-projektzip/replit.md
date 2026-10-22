# RunMyRoute on Replit

## Run
- Existing stack: Node.js (22 on Replit), Express, and plain HTML/JavaScript with Leaflet. Keep the imported structure.
- Click Run to start the `Start application` workflow: `PORT=5000 npm start`.
- The server binds to `0.0.0.0`; the workflow uses port 5000 for the web preview.
- Dependencies are in `package.json`; use `npm ci` to restore the locked dependencies.

## Required secret
- Add `ORS_API_KEY` in Replit Secrets using an OpenRouteService Directions API key from https://openrouteservice.org/dev/#/signup.
- Never put the real key in source, public files, or chat.
- Restart the workflow after adding or changing the key.
- Without the key, the page and map run, but route generation returns HTTP 503 and GPX export remains unavailable.
- `GET /api/status` reports `routingConfigured`; it does not verify that the key is valid.

## Existing behavior
- The interface is Czech and routing is limited to coordinates around the Czech Republic.
- Leaflet assets, OpenStreetMap tiles, and OpenRouteService routing require internet access.
- Surface filtering and exact route length are not guaranteed; see README.md.
- For GPS, open the preview in a separate browser tab and grant location permission if the embedded preview does not allow it.
- Express trusts one reverse-proxy hop for rate limiting; frame blocking is disabled to allow Replit's embedded preview. Other Helmet headers remain enabled.
