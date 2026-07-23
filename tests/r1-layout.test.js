const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/r1-adaptations.css'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'js/r1-adapter.js'), 'utf8');

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
