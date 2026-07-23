/**
 * r1-mock.js - Simulador de Hardware y LLM para desarrollo en navegador
 * Inyecta atajos de teclado y controles virtuales para probar rueda, PTT, acelerómetro y LLM.
 */

window.R1Mock = (function() {
  'use strict';

  let accelInterval = null;
  let currentAccelData = { x: 0.0, y: 0.0, z: 1.0 };
  let accelCallback = null;
  let longPressTimer = null;
  let spacePressedAt = 0;

  function init() {
    if (typeof window.PluginMessageHandler !== 'undefined') {
      return; // Entorno real r1 detected, do not inject full mock UI
    }

    console.log('[R1Mock]: Inicializando simulador de hardware para navegador.');
    setupKeyboardListeners();
    injectDevUI();
  }

  function setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        dispatchHardwareEvent('scrollUp');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        dispatchHardwareEvent('scrollDown');
      } else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        spacePressedAt = Date.now();
        longPressTimer = setTimeout(() => {
          dispatchHardwareEvent('longPressStart');
        }, 500);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        const duration = Date.now() - spacePressedAt;
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (duration >= 500) {
          dispatchHardwareEvent('longPressEnd');
        } else {
          dispatchHardwareEvent('sideClick');
        }
      }
    });
  }

  function dispatchHardwareEvent(name) {
    console.log(`[R1Mock Event]: ${name}`);
    const event = new CustomEvent(name);
    window.dispatchEvent(event);
    highlightDevButton(name);
  }

  function simulateResponse(payload) {
    setTimeout(() => {
      const mockResponse = {
        message: `Simulated r1 response to: "${payload.message}"`,
        pluginId: 'mock-plugin-id',
        data: JSON.stringify({
          status: 'success',
          reply: `Respuesta simulada para: ${payload.message}`,
          timestamp: new Date().toISOString()
        })
      };

      if (typeof window.onPluginMessage === 'function') {
        window.onPluginMessage(mockResponse);
      }
    }, 600);
  }

  function startAccelerometer(callback, options) {
    accelCallback = callback;
    const freq = (options && options.frequency) || 60;
    const intervalMs = Math.floor(1000 / freq);

    if (accelInterval) clearInterval(accelInterval);

    accelInterval = setInterval(() => {
      if (accelCallback) {
        accelCallback({ ...currentAccelData });
      }
    }, intervalMs);
  }

  function stopAccelerometer() {
    if (accelInterval) {
      clearInterval(accelInterval);
      accelInterval = null;
    }
    accelCallback = null;
  }

  function setTilt(x, y, z) {
    currentAccelData = { x, y, z };
  }

  function injectDevUI() {
    if (document.getElementById('r1-mock-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'r1-mock-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 232px;
      background: rgba(20, 20, 20, 0.92);
      border: 1px solid #FE5000;
      border-radius: 8px;
      padding: 4px 6px;
      color: #fff;
      font-family: sans-serif;
      font-size: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    toolbar.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="color:#FE5000;">r1 Dev Mock</strong>
        <span style="font-size:9px; opacity:0.7;">Teclas: ↑↓ Espacio</span>
      </div>
      <div style="display:flex; gap:3px;">
        <button id="mock-btn-up" style="${btnStyle}">▲ Rueda Arriba</button>
        <button id="mock-btn-down" style="${btnStyle}">▼ Rueda Abajo</button>
      </div>
      <div style="display:flex; gap:3px;">
        <button id="mock-btn-click" style="${btnStyle}">PTT Clic</button>
        <button id="mock-btn-long" style="${btnStyle}">PTT Larga</button>
      </div>
    `;

    document.body.appendChild(toolbar);

    document.getElementById('mock-btn-up').addEventListener('click', () => dispatchHardwareEvent('scrollUp'));
    document.getElementById('mock-btn-down').addEventListener('click', () => dispatchHardwareEvent('scrollDown'));
    document.getElementById('mock-btn-click').addEventListener('click', () => dispatchHardwareEvent('sideClick'));
    document.getElementById('mock-btn-long').addEventListener('click', () => {
      dispatchHardwareEvent('longPressStart');
      setTimeout(() => dispatchHardwareEvent('longPressEnd'), 1000);
    });
  }

  const btnStyle = `
    flex: 1;
    background: #333;
    color: #fff;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 3px 0;
    font-size: 9px;
    cursor: pointer;
  `;

  function highlightDevButton(eventName) {
    let id = '';
    if (eventName === 'scrollUp') id = 'mock-btn-up';
    if (eventName === 'scrollDown') id = 'mock-btn-down';
    if (eventName === 'sideClick') id = 'mock-btn-click';
    if (eventName === 'longPressStart' || eventName === 'longPressEnd') id = 'mock-btn-long';

    const btn = document.getElementById(id);
    if (btn) {
      const origBg = btn.style.background;
      btn.style.background = '#FE5000';
      setTimeout(() => { btn.style.background = origBg; }, 200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    dispatchHardwareEvent,
    simulateResponse,
    startAccelerometer,
    stopAccelerometer,
    setTilt
  };
})();
