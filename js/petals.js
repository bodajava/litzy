/* ============================================================
   PÉTALOS — canvas 2D detrás de la pantalla de contraseña
   ============================================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('petals-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1, raf = null, running = true;
  const COLORS = ['#F5A8C4', '#E0729A', '#C6B0E2', '#A6CFE8', '#F7DC8E', '#FFFFFF'];
  let petals = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makePetal(seed) {
    return {
      x: Math.random() * W,
      y: seed ? Math.random() * H : -30 - Math.random() * 120,
      s: 5 + Math.random() * 9,
      vy: 0.28 + Math.random() * 0.62,
      vx: (Math.random() - 0.5) * 0.42,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.017,
      sway: 0.6 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.45 + Math.random() * 0.45,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      flip: 0.55 + Math.random() * 0.45
    };
  }

  function build() {
    const count = reduce ? 0 : Math.round(Math.min(70, Math.max(26, (W * H) / 22000)));
    petals = [];
    for (let i = 0; i < count; i++) petals.push(makePetal(true));
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(1, p.flip);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    // forma de pétalo: dos curvas que se cierran en punta
    ctx.moveTo(0, -p.s);
    ctx.bezierCurveTo(p.s * 0.92, -p.s * 0.5, p.s * 0.72, p.s * 0.72, 0, p.s);
    ctx.bezierCurveTo(-p.s * 0.72, p.s * 0.72, -p.s * 0.92, -p.s * 0.5, 0, -p.s);
    ctx.fill();
    ctx.restore();
  }

  let t = 0;
  function tick() {
    if (!running) return;
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i];
      p.y += p.vy;
      p.x += p.vx + Math.sin(t * p.sway + p.phase) * 0.36;
      p.rot += p.vr;
      p.flip = 0.55 + Math.sin(t * p.sway * 0.7 + p.phase) * 0.42;
      if (p.y > H + 40) petals[i] = makePetal(false);
      if (p.x < -50) p.x = W + 40;
      if (p.x > W + 50) p.x = -40;
      drawPetal(p);
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (reduce) { resize(); return; }
    running = true;
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  resize(); build(); start();

  let rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { resize(); build(); }, 160);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  window.Petals = { stop: stop, start: start };
})();
