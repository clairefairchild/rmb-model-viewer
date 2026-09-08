import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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

for (const weight of [300, 400, 500, 700, 900]) {
  assert.match(css, new RegExp(`font-weight:${weight}`), `Cheddar weight ${weight} must be declared`);
}
assert.match(css, /ronis\.rmbsuite\.com\/api\/fonts\/601448c6-d494-4372-ab00-e8297ebbf273/);
assert.match(html, /ronis\.rmbsuite\.com\/ronis-noodle-map-marker\.png/);
assert.doesNotMatch(html + css + js, /Model Studio|#183d35|Georgia,serif/i);

for (const id of ['canvas', 'home', 'front', 'rear', 'bird', 'walk', 'fullscreen', 'orbit-mode', 'pan-mode', 'zoom-in', 'zoom-out', 'walk-pad', 'loading', 'error', 'disclaimer', 'equipment-library', 'equipment-grid', 'equipment-details', 'library-footer', 'footer-context']) {
  assert.match(html, new RegExp(`id="${id}"`), `required viewer element #${id} must remain present`);
}
for (const behavior of ['OrbitControls', 'setWalk', 'requestFullscreen', 'webglcontextlost', 'GLTFLoader']) {
  assert.match(js, new RegExp(behavior), `required viewer behavior ${behavior} must remain wired`);
}

const equipment = JSON.parse(fs.readFileSync(new URL('../public/equipment.json', import.meta.url), 'utf8'));
assert.equal(equipment.version, 1);
assert(Array.isArray(equipment.equipment));
assert.equal(new Set(equipment.equipment.map(item => item.slug)).size, equipment.equipment.length, 'equipment slugs must be unique');
for (const item of equipment.equipment) {
  assert.match(item.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  for (const field of ['name', 'productName', 'manufacturer', 'model', 'sourceRow', 'approvalStatus', 'fidelityNote', 'asset', 'thumbnail', 'sha256']) {
    assert.equal(typeof item[field], 'string', `${item.slug}.${field} must be a string`);
    assert(item[field].trim(), `${item.slug}.${field} must not be empty`);
  }
  assert.deepEqual(Object.keys(item.envelope).sort(), ['depth', 'height', 'unit', 'width']);
  for (const dimension of ['width', 'depth', 'height']) assert(item.envelope[dimension] > 0, `${item.slug} ${dimension} must be positive`);
  assert.equal(item.envelope.unit, 'in');
  assert(Number.isInteger(item.quantity) && item.quantity > 0, `${item.slug}.quantity must be a positive integer`);
  assert(item.fidelityNote.length <= 320, `${item.slug}.fidelityNote must stay concise`);
  assert.match(item.asset, new RegExp(`^equipment-assets/${item.slug}/[a-f0-9]{12}\\.glb$`));
  assert.match(item.thumbnail, new RegExp(`^equipment-assets/${item.slug}/preview-[a-f0-9]{12}\\.(?:png|jpe?g|webp)$`));
  const assetBytes = fs.readFileSync(new URL(`../public/${item.asset}`, import.meta.url));
  assert.equal(assetBytes.length, item.sizeBytes, `${item.slug} asset byte count must match`);
  assert.equal(crypto.createHash('sha256').update(assetBytes).digest('hex'), item.sha256, `${item.slug} asset SHA-256 must match`);
  assert.equal(item.asset.split('/').at(-1).split('.')[0], item.sha256.slice(0, 12), `${item.slug} asset filename must be content hashed`);
  const thumbnailBytes = fs.readFileSync(new URL(`../public/${item.thumbnail}`, import.meta.url));
  assert(thumbnailBytes.length > 0, `${item.slug} thumbnail must be nonempty`);
  assert.equal(item.thumbnail.split('/').at(-1).match(/^preview-([a-f0-9]{12})\./)[1], crypto.createHash('sha256').update(thumbnailBytes).digest('hex').slice(0, 12), `${item.slug} thumbnail filename must be content hashed`);
}
const firstEquipment = equipment.equipment[0];
assert.equal(firstEquipment.slug, 'vollrath-38002');
assert.equal(firstEquipment.name, 'Vollrath 38002');
assert.deepEqual(firstEquipment.envelope, {width:32, depth:32, height:34, unit:'in'});
assert.equal(firstEquipment.approvalStatus, 'Awaiting Review');
assert.equal(firstEquipment.sourceRow, '18068860263');
assert.equal(firstEquipment.quantity, 1);
const regencyEquipment = equipment.equipment.filter(item => item.slug === 'regency-822tbsdm1530');
assert.equal(regencyEquipment.length, 1);
assert.equal(regencyEquipment[0].name, 'Regency Tables & Sinks 822TBSDM1530');
assert.equal(regencyEquipment[0].productName, 'In-Line Sink · Model 822TBSDM1530');
assert.equal(regencyEquipment[0].manufacturer, 'Regency Tables & Sinks');
assert.equal(regencyEquipment[0].model, '822TBSDM1530');
assert.deepEqual(regencyEquipment[0].envelope, {width:15, depth:30, height:41.75, unit:'in'});
assert.equal(regencyEquipment[0].approvalStatus, 'Awaiting Review');
assert.equal(regencyEquipment[0].sourceRow, '18068862813');
assert.equal(regencyEquipment[0].quantity, 1);
const mainStreetEquipment = equipment.equipment.filter(item => item.slug === 'mainstreet-hc1836h');
assert.equal(mainStreetEquipment.length, 1);
assert.equal(mainStreetEquipment[0].name, 'MainStreet Equipment HC1836H');
assert.equal(mainStreetEquipment[0].productName, 'Heated holding cabinet · Model HC1836H');
assert.equal(mainStreetEquipment[0].manufacturer, 'MainStreet Equipment');
assert.equal(mainStreetEquipment[0].model, 'HC1836H');
assert.deepEqual(mainStreetEquipment[0].envelope, {width:22.6875, depth:32.75, height:66.4375, unit:'in'});
assert.equal(mainStreetEquipment[0].approvalStatus, 'Awaiting Review');
assert.equal(mainStreetEquipment[0].sourceRow, '18068862141');
assert.equal(mainStreetEquipment[0].quantity, 2);
assert.match(mainStreetEquipment[0].fidelityNote, /documented aluminum/);
assert.match(mainStreetEquipment[0].fidelityNote, /hardware alloy is unverified/);
assert.equal(fs.readdirSync(new URL('../public/', import.meta.url), {recursive:true}).some(path => /\.blend$/i.test(path)), false, 'public output must not contain Blender source');

console.log(JSON.stringify({passed:true,checks:['authoritative Roni tenant colors and radius scale','Cheddar production font weights and Roni noodle mark','RMB Suite shell identity without legacy Model Studio tokens','viewer controls, loading/error states, rendering, and disclaimer hooks','equipment schema, exact review data, content hashes, and public-source boundary']},null,2));
