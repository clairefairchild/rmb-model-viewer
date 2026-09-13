# La Vista production v015

Floorplan: https://models.ronismacbar.com/roll-em-up-la-vista-floorplan-v001/
New equipment: https://models.ronismacbar.com/equipment/custom-regency-derived-worktable-36x24/

Headless Blender5.2.1 on GPT-6. Source productionv014 preserved byte-identically; all earlier version directories retained. XY plan: X east, Y north; Z above finished floor. Inherited verified FS1 scale1.5 PDF points/inch; new table dimensions explicitly user-authored. Coordinates below in inches.

## Exact revision

| Assembly | Old datum X,Y,Z | New datum X,Y,Z | Old west | New west |
|---|---|---|---|---|
| Lineup_01_Custom_RegencyDerived_36x24 | 109.519996042, 370.640003775, 0.000000000 | 106.519995712, 370.640003775, 0.000000000 | 94.519994390 | 88.519993729 |
| Lineup_02_38002 | 108.519999061, 342.640013207, 0.000000018 | 104.519992363, 342.640013207, 0.000000018 | 92.520000428 | 88.519993729 |
| Lineup_04_SCL2-60-A-HC | 109.020002245, 284.515027925, 0.000000000 | 104.019998565, 284.515027925, 0.000000000 | 93.519997409 | 88.519993729 |
| POS_RegisterToast14_Stainless | 110.646674014, 141.493119593, 36.749999354 | 99.999998498, 151.000004115, 34.000000616 | 99.332970897 | 88.686295382 |

- Register/POS placed on the nearest existing brushed-stainless work surface, CustomTable_MeasuredTop_34in_AFF, inward of the former diagonal granite. Clear center X100,Y151,Z34. Full native16×16×4.4in base and14in active screen diagonal; yaw224.965366957° retained, employee northwest-facing. Actual square fully contained in concave top polygon; minimum corner-to-support-edge clearance3.500250010in. Exact resting contact34in AFF. One register only; no granite duplicate. No worktop/granite reshaping. v014 accepted register overhang is superseded.
- New reusable custom derivative36×24×34in, NOT official Regency SKU. Same height/materials/shelf/legs/feet/gauge and westward working orientation. Central top/shelf span extended6in: west-half vertices shift6in; east half fixed, legs/feet/end fittings remain rigid. No object scaling. East anchor124.519997694in exactly fixed; south/north358.640002453/382.640005097in unchanged. Reusable origin centered at floor;X36/Y24.
- Steam well rigidly west4.000006698in; cold table rigidly west5.000003680in. Y,Z,size,rotation(-89.999995674°) unchanged. All three west edges88.519993729in; measured difference0in at tolerance0.0001in. Dip-well table also already matches this line and is unchanged exactly.
- All other v014 objects/materials/transforms retained, including walls/floor, kiosks, mural, tile/strip, beverage arrangement, seating. No collision-driven correction necessary.

## Validation

13,649 native checks pass. Exact object count retained; mesh/material/transform checks cover all unaffected objects, no unintended scale changes. World evaluated-mesh AABB/convex XY SAT at0.00002m contact tolerance plus actual triangle BVH: zero external intersections. Internal joints and resting contacts excluded; register support containment checked separately. Static spatial visualization, not ergonomic/installation approval.

Native scene saved/reopened. Export resolves8 existing booth instances and visible curves in a separate copy.2,767 mesh placements/2,809 primitive draws;30 equipment metadata roots; max full-scene roundtrip bound error0.000000953674m. Floor and custom GLBs each validate0 Khronos errors/0 warnings, unlimited issues. Native and exported reusable dimensions/origin independently verified.

Seven final PNGs individually inspected with non-GUI view_image:TopPlan,Isometric,FrontLineTop,RegisterStainless,RegisterTop,Custom36x24Reusable,FrontLineEmployeeClear. First FrontLineEmployee image is diagnostic-only due foreground hood; clear replacement hides hood in render memory only. Native scene and GLB retain full hood/walls.

## Integration

Isolated main/gh-pages worktrees protect shared dirty checkout. No viewer source/bundle changes. Live catalog retains every prior row; main catalog retains its45 existing entries and adds custom model. Three fixed-size catalog assertions updated to allow appended assets while retaining original batch and uniqueness tests. Main brand/core tests pass. Fresh fetch/merge before commits/pushes; no force-push. Final deployment/live evidence appended after verification.

## Limits and artifacts

Custom undercarriage retains source visualization approximation, not manufacturer/fabrication certification. POS/kiosk secondary details illustrative. All earlier limits retained: non-manufacturer-approved Hoshizaki/Cornelius stack, approved0.6875in Coke front overhang, approximate fitted dip-well opening/hood/restroom details; not construction/code/service-clearance documentation.

Native:scene.blend; components/custom-regency-derived-worktable-36x24-v001/{asset.blend,asset.glb,README.md,verification/}; scripts/; renders/; verification/{build-record,scene-audit,collisions,visual-review,prior-hashes}.json.
Web:../roll-em-up-la-vista-web-export-v015/{scene.blend,model.glb}; evidence/{khronos,roundtrip,deploy-record}.json. Previous source/projects never overwritten.
