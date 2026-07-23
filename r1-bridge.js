/**
 * r1-bridge.js - Abstracción de Hardware y SDK para rabbit r1 Creations
 * Proporciona acceso seguro con detección de capacidades a PluginMessageHandler,
 * almacenamiento encriptado, sensores y eventos del dispositivo.
 */

window.R1Bridge = (function() {
  'use strict';

  const isR1Environment = typeof window.PluginMessageHandler !== 'undefined';

  // 1. Mensajería con rabbitOS / LLM
  function postMessage(options) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    const payload = {
      message: options.message || '',
      useLLM: options.useLLM || false,
      wantsR1Response: options.wantsR1Response || false,
      wantsJournalEntry: options.wantsJournalEntry || false
    };

    if (options.data) {
      payload.data = typeof options.data === 'object' ? JSON.stringify(options.data) : options.data;
    }

    if (isR1Environment && window.PluginMessageHandler && typeof window.PluginMessageHandler.postMessage === 'function') {
      window.PluginMessageHandler.postMessage(JSON.stringify(payload));
    } else {
      console.log('[R1Bridge Mock PostMessage]:', payload);
      if (window.R1Mock && typeof window.R1Mock.simulateResponse === 'function') {
        window.R1Mock.simulateResponse(payload);
      }
    }
  }

  // 2. Cerrar WebView
  function close() {
    if (typeof window.closeWebView !== 'undefined' && typeof window.closeWebView.postMessage === 'function') {
      window.closeWebView.postMessage("");
    } else {
      console.log('[R1Bridge Mock]: WebView close requested');
    }
  }

  // 3. Almacenamiento Persistente (Base64)
  async function _getStorageItem(type, key) {
    try {
      if (window.creationStorage && window.creationStorage[type]) {
        const raw = await window.creationStorage[type].getItem(key);
        return raw ? atob(raw) : null;
      }
    } catch (e) {
      console.error(`[R1Bridge Storage Error - ${type}]:`, e);
    }
    // Fallback a localStorage
    const local = localStorage.getItem(`r1_${type}_${key}`);
    return local ? atob(local) : null;
  }

  async function _setStorageItem(type, key, value) {
    const encoded = btoa(value);
    try {
      if (window.creationStorage && window.creationStorage[type]) {
        await window.creationStorage[type].setItem(key, encoded);
        return;
      }
    } catch (e) {
      console.error(`[R1Bridge Storage Error - ${type}]:`, e);
    }
    localStorage.setItem(`r1_${type}_${key}`, encoded);
  }

  async function _removeStorageItem(type, key) {
    try {
      if (window.creationStorage && window.creationStorage[type]) {
        await window.creationStorage[type].removeItem(key);
        return;
      }
    } catch (e) {
      console.error(`[R1Bridge Storage Error - ${type}]:`, e);
    }
    localStorage.removeItem(`r1_${type}_${key}`);
  }

  async function _clearStorage(type) {
    try {
      if (window.creationStorage && window.creationStorage[type]) {
        await window.creationStorage[type].clear();
        return;
      }
    } catch (e) {
      console.error(`[R1Bridge Storage Error - ${type}]:`, e);
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith(`r1_${type}_`))
      .forEach(k => localStorage.removeItem(k));
  }

  const storage = {
    plain: {
      getItem: (key) => _getStorageItem('plain', key),
      setItem: (key, val) => _setStorageItem('plain', key, val),
      removeItem: (key) => _removeStorageItem('plain', key),
      clear: () => _clearStorage('plain')
    },
    secure: {
      getItem: (key) => _getStorageItem('secure', key),
      setItem: (key, val) => _setStorageItem('secure', key, val),
      removeItem: (key) => _removeStorageItem('secure', key),
      clear: () => _clearStorage('secure')
    }
  };

  // 4. Acelerómetro
  const accelerometer = {
    isAvailable: async function() {
      if (window.creationSensors && window.creationSensors.accelerometer) {
        return await window.creationSensors.accelerometer.isAvailable();
      }
      return typeof window.DeviceMotionEvent !== 'undefined';
    },
    start: function(callback, options) {
      if (window.creationSensors && window.creationSensors.accelerometer) {
        window.creationSensors.accelerometer.start(callback, options || { frequency: 60 });
      } else if (window.R1Mock && typeof window.R1Mock.startAccelerometer === 'function') {
        window.R1Mock.startAccelerometer(callback, options);
      }
    },
    stop: function() {
      if (window.creationSensors && window.creationSensors.accelerometer) {
        window.creationSensors.accelerometer.stop();
      } else if (window.R1Mock && typeof window.R1Mock.stopAccelerometer === 'function') {
        window.R1Mock.stopAccelerometer();
      }
    }
  };

  // 5. Suscripción a eventos de hardware
  function on(eventName, handler) {
    window.addEventListener(eventName, handler);
  }

  function off(eventName, handler) {
    window.removeEventListener(eventName, handler);
  }

  // 6. Configurar callback de mensajes entrantes del servidor/LLM
  function onMessage(callback) {
    const originalHandler = window.onPluginMessage;
    window.onPluginMessage = function(data) {
      if (typeof originalHandler === 'function') {
        originalHandler(data);
      }
      if (typeof callback === 'function') {
        callback(data);
      }
    };
  }

  return {
    isR1: isR1Environment,
    postMessage,
    close,
    storage,
    accelerometer,
    on,
    off,
    onMessage
  };
})();
