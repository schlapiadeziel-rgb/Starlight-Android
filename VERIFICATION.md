# Starlight 0.3.27 source verification — 2026-10-06

Implemented: adaptive J2000 equatorial grid, clipped screen paths,
readable tangent-aligned RA/declination ticks, alternative positions on
the same curve, shared label exclusion, and cached bounded geometry.

Passed:
- All 21 Node test scripts via `npm test`, including existing catalog,
  image, projection, sensor-filter, gesture, layout and UI tests.
- 5,112 independent grid-vector comparisons against Astronomy Engine's
  `RotateVector`, at three observers and two dates. Zoom/polar density,
  clipped paths, upright tangent angles, same-view reuse and a limit of
  fewer than 9,000 geometry samples are checked.
- Tick placement checks preserve higher-priority target labels, avoid HUD
  regions and stay within viewport bounds in both orientations.
- Real Chromium 154/SwiftShader browser review: 390×844 portrait at 55°,
  844×390 landscape at 20°, polar view at 85°, roll and red night mode.
  No page errors. In the fixed Capricorn-centered portrait comparison,
  visible coordinate ticks increased from 2 to 14; both RA and declination
  ticks were present. This is an example view, not a universal count.
- Source syntax and whitespace checks. Release workflow checks that the
  new grid renderer and original offline photograph are bundled in APK.

The release workflow requires Android compilation, bundled-asset checks
and verification against the fixed signing certificate before publishing.
The matching GitHub Actions run records the release result.

Android-device visual quality, sensor/AR alignment, frame rate, memory
and power tests remain pending. Desktop checks do not establish Android
performance. Private signing material is excluded from the source.
