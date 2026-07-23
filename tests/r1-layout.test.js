const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/r1-adaptations.css'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'js/r1-adapter.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js/ui/ui.js'), 'utf8');

function r1AssetVersion(asset) {
  const escapedAsset = asset.replace(/\./g, '\\.');
  const match = html.match(new RegExp(`${escapedAsset}\\?v=(\\d+)`));
  assert.ok(match, `Falta versión de caché para ${asset}`);
  return Number(match[1]);
}

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  assert.ok(match, `No existe la regla CSS ${selector}`);
  return match[1];
}

test('los controles táctiles permanecen ocultos fuera de la partida', () => {
  assert.match(rule('#r1-touch-layer'), /display:\s*none\s*!important/);
  assert.match(css, /body\.r1-game-active\s+#r1-touch-layer\s*\{[\s\S]*?display:\s*block\s*!important/);
  assert.match(adapter, /classList\.toggle\(['"]r1-game-active['"],\s*gameActive\)/);
});

test('los controles de perfil anulan el min-height panorámico', () => {
  assert.match(css, /#profile-select,\s*#profile-name\s*\{[\s\S]*?min-height:\s*0\s*!important/);
});

test('los overlays y cuadros modales respetan el viewport de 240 por 282', () => {
  assert.match(css, /#item-modal[\s\S]*?#log-panel\s*\{[\s\S]*?padding:\s*4px\s*!important/);
  assert.match(css, /\.modal-box,\s*\.end-box\s*\{[\s\S]*?width:\s*100%\s*!important[\s\S]*?max-width:\s*232px\s*!important/);
});

test('el fundido queda limitado al lienzo r1 y no al navegador de escritorio', () => {
  assert.match(rule('#fade'), /position:\s*absolute\s*!important/);
  assert.match(rule('#fade'), /width:\s*240px\s*!important/);
  assert.match(rule('#fade'), /height:\s*282px\s*!important/);
});

test('los recursos r1 corregidos invalidan la caché del entorno de pruebas', () => {
  assert.ok(r1AssetVersion('css/r1-adaptations.css') >= 2);
  assert.ok(r1AssetVersion('js/r1-adapter.js') >= 2);
});

test('las pantallas controladas por display inline pueden permanecer ocultas', () => {
  assert.doesNotMatch(rule('#screen-title, #screen-title.title-interface-enabled'), /display:\s*flex\s*!important/);
  assert.doesNotMatch(rule('#screen-card'), /display:\s*flex\s*!important/);
  assert.doesNotMatch(rule('#backpack-panel'), /display:\s*flex\s*!important/);
  assert.doesNotMatch(
    rule('#item-modal, #exit-modal, #choice-modal, #journal-panel, #sound-menu, #screen-end, #log-panel'),
    /display:\s*flex\s*!important/
  );
});

test('el asistente LLM obedece su estado hidden', () => {
  assert.match(css, /#r1-llm-panel\.hidden\s*\{[\s\S]*?display:\s*none\s*!important/);
});

test('main no aborta al enlazar controles opcionales ausentes del port', () => {
  const htmlIds = new Set([...html.matchAll(/\bid=["']([^"']+)/g)].map(match => match[1]));
  const directHandlers = [
    ...main.matchAll(/\$id\(['"]([^'"]+)['"]\)\.(?:onclick|onchange|oninput)\s*=/g),
    ...main.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)\s*\./g),
  ].map(match => match[1]);
  const missing = directHandlers.filter(id => !htmlIds.has(id));
  assert.deepEqual(missing, [], `Controles ausentes enlazados sin guardia: ${missing.join(', ')}`);
  assert.match(main, /const optDado = document\.getElementById\('opt-dado'\);\s*if \(optDado\) \{/);
});

test('UI puede inicializar aunque el port omita paneles secundarios', () => {
  assert.match(ui, /const codexPanel = \$\('codex-panel'\);\s*if \(codexPanel\)/);
  assert.match(ui, /const changelogPanel = \$\('changelog-panel'\);\s*if \(changelogPanel\)/);
});

test('la URL de instalación permanece estable y las actualizaciones son automáticas', () => {
  const creation = JSON.parse(fs.readFileSync(path.join(root, 'creation.json'), 'utf8'));
  assert.equal(creation.url, 'https://evilrender23.github.io/backrooms-r1/');
  assert.ok(fs.existsSync(path.join(root, 'version.json')), 'Falta version.json');
  const version = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
  assert.match(version.build, /^\d{8}-\d{6}$/);
  assert.match(html, /fetch\(['"]version\.json\?t=/);
  assert.match(html, /cache:\s*['"]no-store['"]/);
  assert.match(html, /sessionStorage/);
  assert.match(html, /history\.replaceState/);
  assert.match(html, /setInterval\(checkForUpdate,\s*60000\)/);
});

test('el actualizador no borra partidas ni preferencias persistentes', () => {
  assert.doesNotMatch(html, /localStorage\.(?:clear|removeItem)\s*\(/);
  assert.doesNotMatch(html, /indexedDB\.deleteDatabase\s*\(/);
});
