# Cartoon macaroni blaster v003

Original authored Blender toy design, not a realistic firearm or manufacturer asset.

- Source project: `/Users/claire/.openclaw/workspace/blender-workspace/cartoon-macaroni-blaster-v003/scene.blend`
- Build: official Blender 5.2.1 LTS, headless `build.py`; prior v001/v002 preserved.
- 20,848 triangles; 45 meshes/draws; 5 PBR materials; 323,032 bytes; zero textures/extensions/decoder requirements.
- Khronos validator: zero errors and warnings.
- Explicit design units are meters; origin at cheese-pod center. Blender +Y forward/+Z up becomes glTF -Z forward/+Y up.
- glTF `Muzzle`: `[0, 0.44, -0.429]`; `HandAnchor`: `[0, -0.32, 0.20]`; `CameraAnchor`: `[-0.55, 0.76, 1.65]` (illustrative authoring preview, not runtime camera).
- `CheeseBlaster` renders the asset in a separate fixed-FOV pass at scale 0.42. Named muzzle position is projected to the world camera, including ADS, to align the shot to the visible opening.
- Lazy asset load on first R activation; tiny toy fallback on load failure; no collision/measurement participation. R/Escape cleanup remains existing behavior. Desktop pointer-lock walkthrough pages support the shooter. Equipment review pages remain orbit/measurement-only; mobile never enables the shooter.
- Reduced motion disables recoil and idle bob. No new lighting/shadow textures.
