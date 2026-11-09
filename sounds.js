(function () {
  'use strict';
  var HOVER_FILE = './sounds/hover.mp3';
  var CLICK_FILE = './sounds/click.mp3';
  var HOVER_VOLUME = 0.6;
  var CLICK_VOLUME = 0.8;
  var TARGETS = '.nav__link a, .btn, .footer-links a';
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (e) {}

  var ctx = null;
  var buffers = {};
  var elements = {};

  function keepAlive(c) {
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 40;
    gain.gain.value = 0.002;
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
  }
  function loadSound(name, url) {
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.arrayBuffer();
      })
      .then(function (data) {
        return new Promise(function (resolve, reject) {
          ctx.decodeAudioData(data, resolve, reject);
        });
      })
      .then(function (buf) { buffers[name] = buf; })
      .catch(function (err) {
        var el = new Audio();
        el.preload = 'auto';
        el.addEventListener('canplaythrough', function () { elements[name] = el; }, { once: true });
        el.addEventListener('error', function () {
          console.warn('[sounds] Не удалось загрузить ' + url + ' — проверьте путь и имя файла. Играет встроенный писк.');
        }, { once: true });
        el.src = url;
        el.load();
      });
  }

  function getCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      keepAlive(ctx);
      loadSound('hover', HOVER_FILE);
      loadSound('click', CLICK_FILE);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playBuffer(buf, volume) {
    var src = ctx.createBufferSource();
    var gain = ctx.createGain();
    src.buffer = buf;
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  function playElement(el, volume) {
    var copy = el.cloneNode();
    copy.volume = volume;
    copy.play().catch(function () {});
  }

  function hoverSound() {
    if (!ctx || ctx.state !== 'running') return;
    if (buffers.hover) playBuffer(buffers.hover, HOVER_VOLUME);
    else if (elements.hover) playElement(elements.hover, HOVER_VOLUME);
    else blip(440, 0.08, 0.2);
  }

  function clickSound() {
    if (!ctx || ctx.state !== 'running') return;
    if (buffers.click) {
      playBuffer(buffers.click, CLICK_VOLUME);
    } else if (elements.click) {
      playElement(elements.click, CLICK_VOLUME);
    } else {
      blip(660, 0.07, 0.25);
      setTimeout(function () { blip(880, 0.1, 0.25); }, 55);
    }
  }

  function unlock() { getCtx(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (name) {
    window.addEventListener(name, unlock, { once: true, passive: true });
  });

  document.addEventListener('pointerover', function (e) {
    if (e.pointerType === 'touch') return;
    var el = e.target.closest && e.target.closest(TARGETS);
    if (!el) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return; 
    hoverSound();
  });

  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest(TARGETS);
    if (el && el.matches(':focus-visible')) hoverSound();
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest(TARGETS);
    if (el) clickSound();
  });
})();
