# Starlight 0.3.29 source verification — 2026-10-07

Implemented: original moving solar-limb artwork with a separately cached
texture projection; explicit playback/glow controls and reduced-motion default;
40 offline lunar directory centers, text collision avoidance, tap selection
and feature-centered inspection; detail-view lifecycle cleanup and adaptive
512–1024 pixel idle rendering with 256 pixel gesture rendering.

Passed:
- All 25 Node test scripts via npm test.
- Real Canvas raster checks show evolving solar-limb pixels without changing
  the opaque sphere pixels. A fixed view projects the source once across
  animated draws and glow changes. View changes and resume after release
  rebuild the cache. Geometry is deterministic and bounded to 180 paths of
  21 samples each.
- Controlled frame-clock tests cover one animation chain, approximately
  30-Hz draw cap, frozen time on pause, no hidden-time jump on resume,
  cancellation and permanent disposal.
- DOM lifecycle checks cover pause/play, glow, touch resolution, fully zoomed
  surface, native and visibility pause/resume, offscreen stop, reduced motion,
  close/switch disposal, image cancellation and texture failure. Controls are
  unavailable while texture loading has not succeeded.
- Official USGS lunar KMZ extraction checks 40 unique adopted names and
  IDs, center coordinates, east-positive longitude and directory diameters.
  The source snapshot SHA256 is retained in moon-features-source.json.
- 792 inverse texture/marker coordinate comparisons across rotations,
  pitches and zooms; near/far and dark-side hiding, exact feature centering,
  bounded marker picking and priority/collision handling. DOM checks cover
  the 41-option selector, point selection, cancellation, two-pointer rejection,
  hidden markers and reset.
- Real Chromium 154/SwiftShader checks in 390×844 portrait and 844×390
  landscape, with 2× screen density: solar motion/glow, one cached projection
  across changing frames, native pause/rebuild, offscreen stop, reduced motion
  and deliberately missing texture; lunar near/far centering and detail layout.
  No page errors. Desktop Chinese glyphs are unavailable in this environment;
  geometry and image checks do not validate Android font rendering.
- Fullscreen detail layout keeps landscape controls in a separate scrollable
  panel. Covered chart rendering is skipped and restored when details close.
- Existing original artwork/HIP anchors, galaxy/grid alignment, gestures,
  astronomy, phase and Saturn ring rendering tests remain passing.

The release workflow requires Android compilation, bundled-asset checks
including the solar renderer and 40 lunar records, and verification against
the fixed signing certificate before publishing. The matching GitHub Actions
run records the release result.

No Android-device visual, sensor/AR alignment, frame rate, memory or power
claim is made. Desktop checks cannot establish Android performance. Solar
animation is original artwork, not current activity; lunar directory markers
are reference centers, not scientific terrain boundaries. Private signing
material is excluded from the source.
