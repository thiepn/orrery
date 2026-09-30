# Deployment — The Orrery v1.4.0

P8 keeps the same two deployment units as P7:

1. **Static PWA** — required
2. **Precision Worker** — optional

No additional visual CDN or texture host is required. Antique and Natural rendering are bundled entirely in the static app.

## Static runtime files

```text
index.html
manifest.webmanifest
sw.js
.nojekyll
icons/icon-192.png
icons/icon-512.png
icons/icon-maskable-512.png
```

## Build and verify

```bash
node tools/build.mjs
node tests/tests.mjs
node precision-worker/test.mjs
node --check sw.js
node --check precision-worker/worker.js
python tests/pwa_check.py
```

Browser/visual QA when Playwright dependencies are available:

```bash
python tests/interaction_qa.py
python tests/p6_qa.py
python tests/p7_qa.py
python tests/p8_qa.py
python tests/device_matrix.py
python tests/visual_qa.py
```

## GitHub Pages

The existing Pages workflow rebuilds and tests the source before uploading the static runtime. P8 adds no new deploy-time environment variables.

## Precision Worker

Deploy `precision-worker/` exactly as described in its README. It remains optional and independent from the visual renderer.

## Post-deploy smoke test

1. Load Explore in Antique mode.
2. Toggle `LOOK · NATURAL` and confirm the dark-space renderer appears.
3. Toggle `VIEW · 3D`, follow Saturn and confirm the ring plane is visibly inclined.
4. Open Settings and switch label density through Minimal / Smart / All.
5. Confirm Natural + Settings work at ~390 px phone width.
6. Reload offline and confirm the chosen visual preference restores.
7. If a precision Worker is configured, repeat the existing P7 live-Horizons smoke test.
