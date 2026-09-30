# The Orrery v1.4.0 — Deployment Checklist

## Static application

- [ ] `node tools/build.mjs` completes.
- [ ] Generated `index.html` is committed after the build.
- [ ] `node tests/tests.mjs` passes **33/33**.
- [ ] Embedded browser suite passes **35/35**.
- [ ] `node --check sw.js` passes.
- [ ] `python tests/pwa_check.py` passes.
- [ ] `index.html` identifies `v1.4.0`.
- [ ] `sw.js` uses `orrery-v1.4.0`.
- [ ] No Google Fonts or visual image CDN URL is present.

## Visual QA

- [ ] P5 interaction regression passes **21/21**.
- [ ] P6 regression passes **25/25**.
- [ ] P7 precision regression passes **15/15**.
- [ ] P8 visual interaction suite passes **15/15**.
- [ ] Device matrix passes **13/13**.
- [ ] Visual regression passes **3/3**.
- [ ] Antique is the first-run/default appearance.
- [ ] Natural + 3D Saturn renders without ring/body ordering artifacts.
- [ ] Smart labels do not visibly stack at the default date.
- [ ] Halley shows distinct ion/dust tails near modeled perihelion.
- [ ] Natural mobile mode has no horizontal overflow.

## Precision Worker

- [ ] `node precision-worker/test.mjs` passes **8/8**.
- [ ] `ALLOWED_ORIGIN` is set correctly in production.
- [ ] `/v1/health` succeeds.
- [ ] One live Mars precision query succeeds after deployment.

## Physical-device smoke

- [ ] Chrome/Android: Antique/Natural toggle and pinch zoom.
- [ ] Safari/iPhone: Natural renderer, Settings sheet, fullscreen behavior where supported.
- [ ] Tablet: 3D Saturn rings and label placement.
- [ ] Offline reload after installing the PWA.
