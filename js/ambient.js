/* ============================================================
   MÚSICA DE FONDO — generada en el navegador (Web Audio)

   ¿Por qué no un mp3? Porque el móvil sólo deja sonar audio del
   propio sitio y dentro del gesto del usuario. Esto se genera aquí
   mismo, así que arranca siempre al pulsar "Abrir", también en iPhone.

   Si algún día pones assets/audio/song.mp3, esa canción manda y
   esto no llega a sonar.
   ============================================================ */
window.Ambient = (function () {
  'use strict';

  var ctx = null, master = null, lp = null;
  var timer = null, nextTime = 0, step = 0;
  var playing = false;

  /* --- progresión: Fa · La menor · Si bemol · Do  (cálida y sencilla) --- */
  var CHORDS = [
    { bass: 87.31,  notes: [174.61, 261.63, 349.23, 440.00, 523.25] }, // F
    { bass: 110.00, notes: [220.00, 329.63, 440.00, 523.25, 659.26] }, // Am
    { bass: 116.54, notes: [233.08, 349.23, 466.16, 587.33, 698.46] }, // Bb
    { bass: 130.81, notes: [261.63, 392.00, 523.25, 659.26, 783.99] }  // C
  ];
  var BAR = 4.2;                              // segundos por acorde
  var STEPS = [0, 0.62, 1.24, 1.86, 2.5, 3.2]; // cuándo entra cada nota

  function build() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }

    master = ctx.createGain();
    master.gain.value = 0;

    lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.Q.value = 0.6;

    // eco suave: da sensación de sala sin cargar un impulso
    var delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.34;
    var fb = ctx.createGain();  fb.gain.value = 0.32;
    var wet = ctx.createGain(); wet.gain.value = 0.26;
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(ctx.destination);

    master.connect(lp);
    lp.connect(ctx.destination);
    lp.connect(delay);
    return true;
  }

  // una nota tipo caja de música: dos ondas casi iguales y una caída larga
  function note(freq, at, dur, vol, type) {
    var o1 = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    var g  = ctx.createGain();

    o1.type = type || 'sine';
    o2.type = 'triangle';
    o1.frequency.value = freq;
    o2.frequency.value = freq * 1.004;   // desafine mínimo: suena más cálido

    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    o1.connect(g); o2.connect(g); g.connect(master);
    o1.start(at); o2.start(at);
    o1.stop(at + dur + 0.05);
    o2.stop(at + dur + 0.05);
  }

  function scheduleBar(i, at) {
    var ch = CHORDS[i % CHORDS.length];
    note(ch.bass, at, 3.6, 0.17, 'sine');            // bajo largo
    for (var k = 0; k < STEPS.length; k++) {
      var n = ch.notes[k % ch.notes.length];
      // la última nota de cada compás sube una octava: brillito
      if (k === STEPS.length - 1) n *= 2;
      note(n, at + STEPS[k], 2.4, 0.085, 'sine');
    }
  }

  // vamos programando por delante para que no haya cortes
  function scheduler() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 1.6) {
      scheduleBar(step, nextTime);
      nextTime += BAR;
      step++;
    }
  }

  function start() {
    if (playing) return true;
    if (!ctx && !build()) return false;

    // en iOS el contexto nace suspendido: hay que reanudarlo en el gesto
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();

    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.15;
    scheduler();
    if (!timer) timer = setInterval(scheduler, 400);

    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.34, ctx.currentTime + 3.5);

    playing = true;
    return true;
  }

  function stop() {
    if (!ctx || !playing) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
  }

  function isPlaying() { return playing; }
  function available() { return !!(window.AudioContext || window.webkitAudioContext); }

  return { start: start, stop: stop, isPlaying: isPlaying, available: available };
})();
