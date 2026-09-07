import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

const brandTokens = {
  '--brand-primary': '#ffffff',
  '--brand-secondary': '#000000',
  '--brand-accent': '#fdb431',
  '--black': '#1a1a1a',
  '--light-gray': '#f5f5f5',
  '--radius-xs': '4px',
  '--radius-sm': '8px',
  '--radius-md': '12px',
  '--radius-lg': '16px',
  '--radius-xl': '20px',
};

for (const [token, value] of Object.entries(brandTokens)) {
  assert.match(css, new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*${value.replace('#', '\\#')}`, 'i'), `${token} must match the Roni tenant`);
}

for (const weight of [300, 400, 700, 900]) {
  assert.match(css, new RegExp(`font-weight:${weight}`), `Cheddar weight ${weight} must be declared`);
}
assert.match(css, /ronis\.rmbsuite\.com\/api\/fonts\/601448c6-d494-4372-ab00-e8297ebbf273/);
assert.match(html, /ronis\.rmbsuite\.com\/ronis-noodle-map-marker\.png/);
assert.doesNotMatch(html + css + js, /Model Studio|#183d35|Georgia,serif/i);

for (const id of ['canvas', 'home', 'bird', 'walk', 'fullscreen', 'orbit-mode', 'pan-mode', 'zoom-in', 'zoom-out', 'walk-pad', 'loading', 'error', 'disclaimer']) {
  assert.match(html, new RegExp(`id="${id}"`), `required viewer element #${id} must remain present`);
}
for (const behavior of ['OrbitControls', 'setWalk', 'requestFullscreen', 'webglcontextlost', 'GLTFLoader']) {
  assert.match(js, new RegExp(behavior), `required viewer behavior ${behavior} must remain wired`);
}

console.log(JSON.stringify({passed:true,checks:['authoritative Roni tenant colors and radius scale','Cheddar production font weights and Roni noodle mark','RMB Suite shell identity without legacy Model Studio tokens','viewer controls, loading/error states, rendering, and disclaimer hooks']},null,2));
