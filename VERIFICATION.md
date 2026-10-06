# Starlight 0.3.28 source verification — 2026-10-06

Implemented: density/magnification-aware illustration strength, selected
constellation emphasis, persisted strength control, reuse of projected
mesh points, cancellation/release and memoized image failure.

Passed:
- All 22 Node test scripts via `npm test`.
- Artwork style checks cover magnification, physical density, selected
  versus background art, red night mode, strength bounds and horizon hiding.
- Actual Canvas raster comparison reduces the large white background wash
  by more than half in the synthetic zoom case without changing the
  foreground star pixel. The same projected points are reused during draw.
- Existing checks retain all 85 source artworks and 255 HIP anchor alignments,
  seam-free compositing, one shared bounded canvas and unavailable-canvas
  fallback. Original artwork bytes and anchor metadata are unchanged.
- Real Chromium 154/SwiftShader review in landscape at 20° and portrait at
  65°, including selection, night mode, control persistence/zero strength,
  native pause and AR resource release. No page errors.
- The fixed landscape comparison's art strengths fell from a uniform 0.30
  to about 0.046–0.095. Selecting Capricorn emphasized it at about 0.151
  and dimmed its neighbors to about 0.014–0.028. These are example-view
  render strengths, not device performance or physical brightness measures.
- A deliberately missing Capricorn image was requested once across five
  redraws while the chart and remaining artwork continued to work.

The release workflow requires Android compilation, bundled-asset checks
and verification against the fixed signing certificate before publishing.
The matching GitHub Actions run records the release result.

Android-device visual quality, sensor/AR alignment, frame rate, memory
and power tests remain pending. Desktop checks do not establish Android
performance. Private signing material is excluded from the source.
