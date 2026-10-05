// wwwroot/js/research.js
// Apoyo del módulo de sesión en tableta (Protocolo C&W-NM).
//
// Bloque sensorial (§7.4 paso 2.2, §9.1.5):
//  - Audio sintetizado con WebAudio; cada nivel tiene una ganancia calibrada por el
//    personal con sonómetro clase 2 a la altura del oído (55, 62 y 68–70 dB(A)).
//  - Toda transición de volumen dura >= 3 s: no hay impulsos sonoros súbitos.
//  - Visual: patrones que se desplazan lentamente. La frecuencia temporal en cada
//    píxel = velocidad / periodo espacial, que se mantiene < 0.5 Hz, muy por debajo
//    de la banda fotosensible de 3–60 Hz. No hay cambios de luminancia global.
// Los sonidos sintetizados son un sustituto: el grupo asesor (§10.5) debe revisar y,
// si lo decide, reemplazarlos por grabaciones calibradas.

window.nbmResearch = (function () {
  const RAMP = 3; // segundos

  // ── Descargas ─────────────────────────────────────────────────────────────
  function download(name, text, mime) {
    const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Pantalla encendida ────────────────────────────────────────────────────
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
      if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { /* sin contexto seguro o sin soporte: no es crítico */ }
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  let ctx = null, master = null, layers = [], chimeTimer = null;

  function noiseBuffer(seconds, brown) {
    const len = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w * 0.5;
    }
    return buf;
  }

  // Ruido filtrado con una modulación lenta de amplitud (0.05–0.4 Hz), sin golpes.
  function noiseLayer(brown, type, freq, q, lfoHz, depth) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(4, brown);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type; filter.frequency.value = freq; filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.value = 1 - depth;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = lfoHz;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = depth;
    lfo.connect(lfoGain).connect(amp.gain);
    src.connect(filter).connect(amp);
    return { out: amp, start: () => { src.start(); lfo.start(); }, stop: () => { src.stop(); lfo.stop(); } };
  }

  function padLayer(freqs) {
    const amp = ctx.createGain();
    amp.gain.value = 0.15;
    const oscs = freqs.map(f => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(amp); return o; });
    return { out: amp, start: () => oscs.forEach(o => o.start()), stop: () => oscs.forEach(o => o.stop()) };
  }

  // Campanas suaves: ataque de 0.6 s y caída de 2.5 s; nunca un pico súbito.
  function chime(dest, level) {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = 'triangle';
    o.frequency.value = [523, 659, 784, 880][Math.floor(Math.random() * 4)];
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.6);
    g.gain.linearRampToValueAtTime(0, t + 3.1);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 3.2);
  }

  function buildLevel(level) {
    const ls = [];
    // Nivel 1: ambiente suave
    ls.push(noiseLayer(true, 'lowpass', 700, 0.7, 0.08, 0.3));
    ls.push(padLayer([196, 247, 294]));
    // Nivel 2: entorno escolar mixto (murmullo en banda de voz)
    if (level >= 2) {
      ls.push(noiseLayer(false, 'bandpass', 900, 0.8, 0.25, 0.5));
      ls.push(noiseLayer(false, 'bandpass', 2000, 1.2, 0.17, 0.5));
    }
    // Nivel 3: sonidos superpuestos
    if (level >= 3) {
      ls.push(noiseLayer(false, 'bandpass', 450, 1.0, 0.33, 0.6));
      ls.push(noiseLayer(true, 'lowpass', 1500, 0.5, 0.11, 0.4));
    }
    return ls;
  }

  function startAudio(level, gain) {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    stopAudio(true);
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    layers = buildLevel(level);
    layers.forEach(l => { l.out.connect(master); l.start(); });
    master.gain.linearRampToValueAtTime(gain, ctx.currentTime + RAMP);
    if (level >= 2) {
      chimeTimer = setInterval(() => chime(master, level === 2 ? 0.2 : 0.35), level === 2 ? 7000 : 4000);
    }
  }

  function stopAudio(immediate) {
    if (chimeTimer) { clearInterval(chimeTimer); chimeTimer = null; }
    if (!master) return;
    const m = master, ls = layers, t = ctx.currentTime;
    master = null; layers = [];
    const fade = immediate ? 0.05 : RAMP;
    m.gain.cancelScheduledValues(t);
    m.gain.setValueAtTime(m.gain.value, t);
    m.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { ls.forEach(l => { try { l.stop(); } catch (e) { } }); m.disconnect(); }, (fade + 0.1) * 1000);
  }

  // ── Visual ────────────────────────────────────────────────────────────────
  let raf = null, canvas = null, shapes = [], visualLevel = 1, t0 = 0;

  const PALETTES = {
    1: ['#93c5fd', '#a7f3d0', '#fde68a', '#c4b5fd'],
    2: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
    3: ['#111827', '#f9fafb'],
  };

  function seedShapes(level, w, h) {
    const n = level === 1 ? 6 : 14;
    const pal = PALETTES[level === 3 ? 2 : level];
    shapes = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: 30 + Math.random() * (level === 1 ? 50 : 35),
      vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18, // px/s
      c: pal[Math.floor(Math.random() * pal.length)],
    }));
  }

  function draw(ts) {
    if (!canvas) return;
    const g = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height, s = (ts - t0) / 1000;
    if (visualLevel === 3) {
      // Franjas de alto contraste: periodo 160 px, 24 px/s → 0.15 Hz por píxel.
      const period = 160, off = (s * 24) % period;
      g.fillStyle = PALETTES[3][1]; g.fillRect(0, 0, w, h);
      g.fillStyle = PALETTES[3][0];
      for (let x = -period + off; x < w + h; x += period) {
        g.beginPath();
        g.moveTo(x, 0); g.lineTo(x + period / 2, 0); g.lineTo(x + period / 2 - h, h); g.lineTo(x - h, h);
        g.closePath(); g.fill();
      }
    } else {
      g.fillStyle = visualLevel === 1 ? '#f1f5f9' : '#e2e8f0';
      g.fillRect(0, 0, w, h);
    }
    const dt = 1 / 60;
    shapes.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -p.r) p.x = w + p.r; if (p.x > w + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = h + p.r; if (p.y > h + p.r) p.y = -p.r;
      g.globalAlpha = visualLevel === 1 ? 0.6 : 0.85;
      g.fillStyle = p.c;
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
    });
    g.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }

  function startVisual(el, level) {
    stopVisual();
    canvas = el;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    visualLevel = level;
    seedShapes(level, canvas.width, canvas.height);
    t0 = performance.now();
    raf = requestAnimationFrame(draw);
  }

  function stopVisual() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    canvas = null;
  }

  // ── API pública ───────────────────────────────────────────────────────────
  return {
    download,
    keepAwake,
    sensoryStart: (el, level, gain) => { startAudio(level, gain); startVisual(el, level); },
    sensoryStop: () => { stopAudio(false); stopVisual(); },
    sensoryStopNow: () => { stopAudio(true); stopVisual(); },
    // Calibración: solo audio, para medir con el sonómetro.
    calibrateStart: (level, gain) => startAudio(level, gain),
    calibrateGain: (gain) => { if (master && ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.5); } },
    calibrateStop: () => stopAudio(false),
  };
})();
