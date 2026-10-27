# Starlight 0.3.43 verification — 2026-10-27

The release workflow runs 34 Node test scripts, camera preview geometry and reminder policy Java checks, then builds and verifies the signed Android APK.

Search coverage includes exact HIP/M/NGC IDs, spaces, hyphens, full-width text, leading zeroes, Chinese/English names, result order, missing IDs, and reused normalization. UI smoke tests enter full-width M31 and spaced NGC 1976.

Package: org.starlight.free, version 0.3.43 / 55, minimum API 26, target API 35. CI verifies the fixed release certificate and bundled search script.

No physical Android device validation was performed for this revision. Desktop DOM/raster tests do not establish mobile FPS, power consumption, sensor accuracy or Android installation behavior.
