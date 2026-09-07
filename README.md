# Roni’s Model Studio

A reusable static Three.js viewer for shareable architectural models. No account or installation is needed to view a project in Chrome.

- **Library:** https://models.ronismacbar.com/
- **First project:** https://models.ronismacbar.com/ronis-renovation-001/
- **Repository:** https://github.com/clairefairchild/rmb-model-viewer
- **Source directory:** `/Users/claire/.openclaw/workspace/rmb-model-viewer`
- **Hosting:** GitHub Pages, `gh-pages` branch, root folder. App source is on `main`.

## Explore

- Drag to orbit; right-drag or choose **Pan** to pan; scroll, pinch, or use **+/−** to zoom.
- On touch screens, one finger orbits and two fingers pan/zoom. Pan mode changes one-finger drag to panning.
- **Home** resets framing; **Bird’s-eye** shows the plan from above.
- **Walk through** sets an eye-level camera. Drag to look, use WASD/arrow keys or the on-screen directional pad to move. Shift moves faster; Escape exits. This is free navigation, **without wall collision or egress simulation**.
- **Fullscreen** expands the viewer where supported. Devices that restrict the Fullscreen API retain the normal responsive view.

The first model is an **explicit-design first pass**, not construction documentation or a verified as-built. The source shell omits fixtures, furniture, roof/ceilings, door leaves, frames, and glazing panes. Window and door openings are real voids. Preview lighting is not a lighting design.

## Publish the next Blender model — no viewer rebuild

All Blender interaction must be executed by an approved **GPT-6+ worker** using the Blender Modeling skill. Read `../skills/blender-modeling/SKILL.md` first. The publisher uses only the official headless Blender binary and never saves the source `.blend`.

Prerequisites: Node/npm, Python 3, `/Applications/Blender.app/Contents/MacOS/Blender`, and authenticated GitHub access with permission to push this repository. Credentials are read by Git/gh; no tokens belong in this project.

```bash
cd /Users/claire/.openclaw/workspace/rmb-model-viewer
npm ci
python3 scripts/publish.py /absolute/path/to/blender-project \
  --slug next-project \
  --title 'Next Project' \
  --revision 'Shell v001' \
  --description 'A first look at the next space.' \
  --thumbnail /absolute/path/to/preview.png \
  --deploy
```

The first argument accepts either a project directory containing `scene.blend` or a `.blend` file. Thumbnail/description/revision are optional. Slugs use lowercase letters, numbers, and hyphens. Use `--replace` only for an intentional update to an existing project; otherwise duplicate slugs fail safely. All currently published projects remain in the catalog.

The command:

1. Acquires a local publication lock and hashes the source scene.
2. Opens it headlessly and exports render-visible mesh geometry/materials to a temporary GLB; cameras, lights, animation, annotations, and custom scene metadata are excluded.
3. Requires Blender exit 0 and an unchanged source hash, then runs Khronos glTF Validator. Validation errors stop publication.
4. Writes a content-hashed model under `public/models/<slug>/` and `site/models/<slug>/`, then atomically updates the shared `projects.json` manifest.
5. Generates a thin route file using the **same prebuilt viewer bundle**; there is no per-model application or code build.
6. Pushes the static site to `gh-pages` from a temporary isolated checkout, retaining historical content-hashed assets for existing links/tabs. It waits for a matching live page and verifies catalog/model responses before reporting a verified deployment.
7. Returns `https://models.ronismacbar.com/<slug>/`. Export logs, validation results, and source-preservation evidence stay local in `evidence/` (gitignored).

Omit `--deploy` to prepare/review files without publishing. Retry a prepared deployment with:

```bash
python3 scripts/publish.py --deploy-only
```

After publishing, commit the updated `public/` and `site/` catalog/assets on `main` to keep the source repository synchronized. The publisher intentionally does not commit unrelated local source edits. GitHub Pages can take a few minutes to update; caching can retain an earlier catalog for up to ten minutes. Content-hashed model URLs prevent stale model bytes.

## Change the viewer

```bash
npm ci
npm run dev
# After editing shared source:
npm run build
python3 scripts/publish.py --deploy-only
```

`npm run build` copies the canonical `public/` catalog and models into `site/`. The publisher then regenerates routes. Keep `site/` checked in so routine model publication needs no rebuild. All project titles/descriptions are inserted as text, never untrusted HTML.

## Architecture and limits

- `src/` — one shared Three.js application and responsive styles.
- `public/projects.json` — project manifest: slug, title, revision, description, content-hashed asset, optional thumbnail, byte length, SHA-256, disclaimer.
- `public/models/` — web assets only, not Blender source files.
- `site/` — built static site, reusable for future publications.
- `scripts/export_blend.py` — conservative headless Blender GLB export.
- `scripts/publish.py` — export, validate, update, deploy, verify.
- `scripts/verify-live.mjs` — real headless Google Chrome desktop/mobile functional checks and screenshots.

The first asset is 241,464 bytes (235.8 KiB), 209 mesh objects, 2,580 triangles, four PBR materials, no textures. Compression is intentionally unnecessary at this size; no Draco/Meshopt decoder or external CDN dependency is required. The shared Three.js bundle is approximately 151 KB gzipped. Larger future models should be optimized before publication; GitHub limits individual repository files to 100 MiB and Pages sites to 1 GB. This public static host is for non-confidential, explicitly approved models, not a private access-controlled design portal.

## Hosting and DNS

Cloudflare Pages/R2 were preferred but no Cloudflare API token, authenticated Wrangler configuration, or existing Cloudflare access was found in the checked local hosting configuration. GitHub CLI was already authenticated, so GitHub Pages provides an existing authorized deterministic static/CDN host without a server.

Authoritative DNS remains Bluehost (`ns1.bluehost.com`, `ns2.bluehost.com`). Exactly one new DNS record was added through the existing cPanel API:

```text
models.ronismacbar.com.  300  IN  CNAME  clairefairchild.github.io.
```

GitHub Pages custom domain is `models.ronismacbar.com`, with managed TLS and HTTPS enforcement. `public/CNAME` preserves it on deployment. No primary-site files, `/models` route, apex DNS, or other production records were changed.

The provider URL `https://clairefairchild.github.io/rmb-model-viewer/ronis-renovation-001/` was tested before attaching the domain. With the custom domain enabled, GitHub redirects it to the custom domain; it is **not an independent fallback**. If the domain must be detached for recovery, remove the Pages custom-domain setting and CNAME file through an explicitly scoped deployment; the shared relative asset paths support the provider prefix.

## Verification

```bash
npm run build
node scripts/validate-glb.mjs public/models/ronis-renovation-001/96ee23fa67fc.glb
node scripts/verify-live.mjs https://models.ronismacbar.com/ronis-renovation-001/
gh api repos/clairefairchild/rmb-model-viewer/pages
dig +short models.ronismacbar.com @1.1.1.1
curl -I https://models.ronismacbar.com/ronis-renovation-001/
```

Live verification checks model loading, real orbit/pan/zoom movement, walkthrough keyboard/pad movement and drag-to-look, Home/Bird’s-eye, desktop fullscreen, desktop/mobile viewport fit, and browser errors. Screenshots and JSON reports are written to `evidence/`. The host serves GLB with `Content-Type: model/gltf-binary` and `Access-Control-Allow-Origin: *`.
