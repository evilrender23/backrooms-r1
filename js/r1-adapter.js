/**
 * js/r1-adapter.js - Adaptador de Controles y Funcionalidades para Rabbit R1
 * Gestiona el mapeo de la rueda de desplazamiento, botón lateral PTT,
 * controles táctiles, acelerómetro y detección automática de modales para 240x282.
 */

(function() {
  'use strict';

  console.log('[R1Adapter] Inicializando adaptador de controles y maquetación (240x282)...');

  const R1State = {
    llmOpen: false,
    accelEnabled: false,
    currentFocusIndex: 0
  };

  // Enviar evento de teclado simulado al documento
  function sendKeyEvent(type, code, key) {
    const event = new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      code: code,
      key: key || code,
      keyCode: getKeyCode(code),
      which: getKeyCode(code)
    });
    document.dispatchEvent(event);
  }

  function getKeyCode(code) {
    const map = {
      KeyW: 87, KeyS: 83, KeyA: 65, KeyD: 68,
      Space: 32, KeyF: 70, KeyB: 66, KeyM: 77,
      KeyL: 76, KeyC: 67, KeyQ: 81, KeyE: 69,
      Escape: 27, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39
    };
    return map[code] || 0;
  }

  function pressKey(code, duration = 120) {
    sendKeyEvent('keydown', code);
    setTimeout(() => {
      sendKeyEvent('keyup', code);
    }, duration);
  }

  // --- Detección continua de Modales para adaptar capa táctil ---
  function updateModalState() {
    const modals = [
      'backpack-panel', 'item-modal', 'exit-modal', 'choice-modal',
      'journal-panel', 'sound-menu', 'screen-end', 'log-panel', 'r1-llm-panel'
    ];
    let isModalOpen = false;
    for (const id of modals) {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none' && !el.classList.contains('hidden')) {
        isModalOpen = true;
        break;
      }
    }

    const screenTitle = document.getElementById('screen-title');
    if (screenTitle && screenTitle.style.display !== 'none') {
      isModalOpen = true;
    }

    if (isModalOpen) {
      document.body.classList.add('r1-modal-open');
    } else {
      document.body.classList.remove('r1-modal-open');
    }
  }

  // --- 1. CONFIGURACIÓN DE RUEDA DE DESPLAZAMIENTO & PTT ---
  function initHardwareEvents() {
    window.addEventListener('scrollUp', () => handleScrollUp());
    window.addEventListener('scrollDown', () => handleScrollDown());

    window.addEventListener('wheel', (e) => {
      if (e.deltaY < 0) {
        handleScrollUp();
      } else if (e.deltaY > 0) {
        handleScrollDown();
      }
    }, { passive: true });

    window.addEventListener('sideClick', () => handleSideClick());
    window.addEventListener('longPressStart', () => triggerLLMAssistant());

    if (window.R1Bridge) {
      R1Bridge.onMessage((data) => handleLLMResponse(data));
    }
  }

  function handleScrollUp() {
    const activeModal = document.querySelector('.modal-box:not([style*="display: none"]), .end-box:not([style*="display: none"])');
    if (activeModal) {
      activeModal.scrollTop -= 24;
      return;
    }

    if (isGameActive()) {
      pressKey('KeyW', 140);
    } else {
      navigateMenu(-1);
    }
  }

  function handleScrollDown() {
    const activeModal = document.querySelector('.modal-box:not([style*="display: none"]), .end-box:not([style*="display: none"])');
    if (activeModal) {
      activeModal.scrollTop += 24;
      return;
    }

    if (isGameActive()) {
      pressKey('KeyS', 140);
    } else {
      navigateMenu(1);
    }
  }

  function handleSideClick() {
    if (isGameActive()) {
      pressKey('KeyF');
    } else {
      clickActiveMenuElement();
    }
  }

  function isGameActive() {
    const screenGame = document.getElementById('screen-game');
    return screenGame && screenGame.style.display !== 'none';
  }

  function navigateMenu(direction) {
    const focusable = Array.from(document.querySelectorAll(
      '#screen-title button, #screen-title select, #screen-title input, .modal-box button'
    )).filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);

    if (focusable.length === 0) return;

    R1State.currentFocusIndex = (R1State.currentFocusIndex + direction + focusable.length) % focusable.length;
    const target = focusable[R1State.currentFocusIndex];
    if (target) {
      target.focus();
    }
  }

  function clickActiveMenuElement() {
    const active = document.activeElement;
    if (active && typeof active.click === 'function') {
      active.click();
    } else {
      const btnStart = document.getElementById('btn-offline') || document.getElementById('btn-start');
      if (btnStart) btnStart.click();
    }
  }

  // --- 2. ASISTENTE LLM DE SUPERVIVENCIA EN LAS BACKROOMS ---
  function triggerLLMAssistant() {
    const llmPanel = document.getElementById('r1-llm-panel');
    const llmText = document.getElementById('r1-llm-text');
    if (!llmPanel || !llmText) return;

    llmPanel.classList.remove('hidden');
    updateModalState();
    llmText.textContent = 'Consultando superordenador R1 sobre las Backrooms...';

    let contextPrompt = 'El jugador está explorando las Backrooms.';
    if (window.Game && window.Game.world && window.Game.world.jugador) {
      const w = window.Game.world;
      const lvl = w.level ? w.level.nombre || w.level.id : 'Level 0';
      const salud = w.jugador.salud || 100;
      const cordura = w.jugador.cordura || 100;
      contextPrompt = `El jugador explora ${lvl} en las Backrooms. Salud: ${salud}%, Cordura: ${cordura}%. Dale un consejo táctico breve de 2 frases sobre peligros y supervivencia.`;
    }

    if (window.R1Bridge) {
      R1Bridge.postMessage({
        message: contextPrompt,
        useLLM: true,
        wantsR1Response: true,
        wantsJournalEntry: false
      });
    }
  }

  function handleLLMResponse(data) {
    const llmText = document.getElementById('r1-llm-text');
    if (!llmText) return;

    let responseMsg = 'Las paredes zumban... No se recibe respuesta clara.';
    if (typeof data === 'string') {
      responseMsg = data;
    } else if (data && data.message) {
      responseMsg = data.message;
    } else if (data && data.data) {
      try {
        const parsed = JSON.parse(data.data);
        responseMsg = parsed.message || parsed.text || data.data;
      } catch (e) {
        responseMsg = data.data;
      }
    }

    llmText.textContent = responseMsg;
  }

  // --- 3. CONTROLES TÁCTILES OVERLAY R1 ---
  function initTouchControls() {
    const dpadUp = document.getElementById('r1-dpad-up');
    const dpadDown = document.getElementById('r1-dpad-down');
    const dpadLeft = document.getElementById('r1-dpad-left');
    const dpadRight = document.getElementById('r1-dpad-right');

    const btnAct = document.getElementById('r1-btn-act');
    const btnLuz = document.getElementById('r1-btn-luz');
    const btnMoc = document.getElementById('r1-btn-moc');
    const btnMap = document.getElementById('r1-btn-map');
    const btnLLM = document.getElementById('r1-btn-llm');
    const btnCloseLLM = document.getElementById('r1-llm-close');

    bindTouchHold(dpadUp, 'KeyW');
    bindTouchHold(dpadDown, 'KeyS');
    bindTouchHold(dpadLeft, 'KeyA');
    bindTouchHold(dpadRight, 'KeyD');

    if (btnAct) btnAct.addEventListener('pointerdown', () => pressKey('Space'));
    if (btnLuz) btnLuz.addEventListener('pointerdown', () => pressKey('KeyF'));
    if (btnMoc) btnMoc.addEventListener('pointerdown', () => pressKey('KeyB'));
    if (btnMap) btnMap.addEventListener('pointerdown', () => pressKey('KeyM'));
    if (btnLLM) btnLLM.addEventListener('pointerdown', () => triggerLLMAssistant());
    if (btnCloseLLM) btnCloseLLM.addEventListener('click', () => {
      document.getElementById('r1-llm-panel').classList.add('hidden');
      updateModalState();
    });
  }

  function bindTouchHold(element, code) {
    if (!element) return;
    let intervalId = null;

    const startPress = (e) => {
      e.preventDefault();
      element.classList.add('active');
      sendKeyEvent('keydown', code);
      if (!intervalId) {
        intervalId = setInterval(() => sendKeyEvent('keydown', code), 80);
      }
    };

    const stopPress = (e) => {
      if (e) e.preventDefault();
      element.classList.remove('active');
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      sendKeyEvent('keyup', code);
    };

    element.addEventListener('pointerdown', startPress);
    element.addEventListener('pointerup', stopPress);
    element.addEventListener('pointercancel', stopPress);
    element.addEventListener('pointerleave', stopPress);
  }

  // --- 4. INICIALIZACIÓN ---
  document.addEventListener('DOMContentLoaded', () => {
    initHardwareEvents();
    initTouchControls();

    const resizeCanvases = () => {
      const gc = document.getElementById('game-canvas');
      const glc = document.getElementById('gl-canvas');
      if (gc) { gc.width = 240; gc.height = 282; }
      if (glc) { glc.width = 240; glc.height = 282; }
    };
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);

    setInterval(updateModalState, 300);

    console.log('[R1Adapter] Adaptador r1 listo. Pantalla fijada a 240x282 px con soporte de modales.');
  });

})();
