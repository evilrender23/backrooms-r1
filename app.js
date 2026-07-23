/**
 * app.js - Backrooms R1
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  let count = 0;
  const counterEl = document.getElementById('counter-value');
  const statusEl = document.getElementById('status-text');
  const llmBoxEl = document.getElementById('llm-response');
  const llmTextEl = document.getElementById('llm-text');

  // Cargar estado
  try {
    const saved = await R1Bridge.storage.plain.getItem('count');
    if (saved !== null) {
      count = parseInt(saved, 10) || 0;
      updateDisplay();
    }
  } catch (e) {
    console.error('Error cargando estado:', e);
  }

  function updateDisplay() {
    if (counterEl) {
      counterEl.textContent = count;
    }
  }

  // Eventos de rueda
  R1Bridge.on('scrollUp', async () => {
    count++;
    updateDisplay();
    await R1Bridge.storage.plain.setItem('count', count.toString());
  });

  R1Bridge.on('scrollDown', async () => {
    count--;
    updateDisplay();
    await R1Bridge.storage.plain.setItem('count', count.toString());
  });

  // Evento PTT
  R1Bridge.on('sideClick', () => {
    if (statusEl) {
      statusEl.textContent = 'Enviando petición a r1...';
    }
    R1Bridge.postMessage({
      message: `Backrooms R1: Estado actual = ${count}. Proporciona una respuesta adecuada.`,
      useLLM: true
    });
  });

  // Respuesta de LLM
  R1Bridge.onMessage((data) => {
    let reply = '';
    if (data && data.data) {
      try {
        const parsed = JSON.parse(data.data);
        reply = parsed.reply || parsed.message || data.data;
      } catch (e) {
        reply = data.data;
      }
    } else if (data && data.message) {
      reply = data.message;
    }

    if (reply) {
      if (llmTextEl && llmBoxEl) {
        llmTextEl.textContent = reply;
        llmBoxEl.classList.remove('hidden');
      }
      if (statusEl) {
        statusEl.textContent = 'Respuesta recibida.';
      }
    }
  });

  
});
