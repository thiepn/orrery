# The Orrery Precision Proxy

Optional read-only Cloudflare Worker for The Orrery v1.4.0 precision mode. The proxy exists because NASA/JPL's API policy does not permit direct website embedding.

## Routes

- `GET /v1/health`
- `GET /v1/lookup?q=Apophis`
- `GET /v1/observer?target=499&jd=2461313.5&lat=50.94&lon=6.96&elev=0`
- `GET /v1/elements?target=499&jd=2461313.5`
- `GET /v1/events?type=solar-eclipse&target=301&jd=2461313.5&lat=50.94&lon=6.96&elev=0`

Event types: `solar-eclipse`, `solar-transit`, `satellite`, `occultation`.

The Worker only constructs whitelisted Horizons requests; it is not a generic proxy. Event-scan upstream requests are sequential. Cloudflare Cache API responses reduce repeated Horizons calls.

## Deploy

Set the production origin first:

```toml
[vars]
ALLOWED_ORIGIN = "https://your-orrery.example"
```

Then:

```bash
npx wrangler deploy
```

Configure the resulting base URL ending `/v1` in The Orrery Settings or its `orrery-precision-endpoint` meta tag.

## Privacy

Observer precision queries contain latitude, longitude, time and target. Those values are sent through this Worker to NASA/JPL Horizons. The static app discloses this before precision use.

## Security model

- GET/OPTIONS only.
- Route and parameter allowlist.
- Bounded target strings and numeric observer/JD validation.
- Browser origin can be restricted exactly using `ALLOWED_ORIGIN`.
- CORS is not authentication; add provider-level rate limiting if publishing a heavily used public proxy.

## Limits

- JPL Horizons is an external best-effort dependency.
- API output formats may change; parser regression tests should be run on every release.
- Precision event scans use 10-minute samples and are event detectors, not contact-time solvers.
- Offline mode remains available when the proxy or Horizons is unavailable.
