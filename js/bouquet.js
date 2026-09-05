/* ============================================================
   RAMO 3D — Three.js
   Flores generadas por código: rosas en capas, margaritas,
   nube de flor pequeña, hojas, papel kraft y lazo verde.
   ============================================================ */
window.Bouquet = (function () {
  'use strict';

  var canvas, renderer, scene, camera, root, spin, clock;
  var raf = null, visible = true, ready = false;
  var flowers = [], sparkles = [];
  var pointer = { down: false, x: 0, lastX: 0, vel: 0, target: 0, current: 0 };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PALETTE = {
    rose:   [0xe8619a, 0xf58cb6, 0xd44e88, 0xb98ad6, 0xf7a9c8],
    cream:  [0xffffff, 0xfff6de],
    gold:   0xf7dc8e,
    sage:   0x8ed0b2,
    sageDk: 0x63b492,
    kraft:  0xfdd0e0,
    kraftD: 0xf0a9c6
  };

  /* ---------- geometría de un pétalo ---------- */
  function petalGeometry(curl, cup) {
    var s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.40, 0.06, 0.64, 0.52, 0.30, 0.96);   // lado derecho
    s.bezierCurveTo(0.18, 1.08, -0.18, 1.08, -0.30, 0.96); // borde superior redondo
    s.bezierCurveTo(-0.64, 0.52, -0.40, 0.06, 0, 0);       // lado izquierdo
    var g = new THREE.ShapeGeometry(s, 16);
    var pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i);
      // ahueca a lo ancho + riza la punta hacia atrás
      var z = -(x * x) * cup + (y * y) * curl * 0.42;
      pos.setZ(i, z);
    }
    g.computeVertexNormals();
    return g;
  }

  var GEO = {};
  function initGeometries() {
    GEO.petalIn  = petalGeometry(0.55, 2.25);
    GEO.petalMid = petalGeometry(0.85, 1.70);
    GEO.petalOut = petalGeometry(1.25, 1.05);
    GEO.leaf     = petalGeometry(0.40, 0.30);
    GEO.bud      = new THREE.SphereGeometry(1, 10, 8);
    GEO.stem     = new THREE.CylinderGeometry(0.012, 0.018, 1, 6, 1);
  }

  function mat(color, rough, opts) {
    opts = opts || {};
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: rough === undefined ? 0.78 : rough,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: false,
      transparent: !!opts.transparent,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity || 0
    });
  }

  /* ---------- una rosa ---------- */
  function makeRose(color, size) {
    var g = new THREE.Group();
    var m = mat(color, 0.68, { emissive: color, emissiveIntensity: 0.02 });
    var mIn = mat(color, 0.62, { emissive: color, emissiveIntensity: 0.06 });

    // tilt: PI/2 = pétalo vertical, 0 = pétalo tumbado.
    // El centro va cerrado y hacia arriba; hacia fuera se va abriendo.
    var rings = [
      { geo: GEO.petalIn,  n: 4, rad: 0.028, sc: 0.48, tilt: 1.50, y: 0.088, mat: mIn },
      { geo: GEO.petalIn,  n: 6, rad: 0.058, sc: 0.66, tilt: 1.30, y: 0.062, mat: mIn },
      { geo: GEO.petalMid, n: 8, rad: 0.096, sc: 0.84, tilt: 1.02, y: 0.034, mat: m },
      { geo: GEO.petalMid, n: 9, rad: 0.140, sc: 0.98, tilt: 0.74, y: 0.010, mat: m },
      { geo: GEO.petalOut, n: 10, rad: 0.186, sc: 1.06, tilt: 0.44, y: -0.014, mat: m }
    ];

    for (var r = 0; r < rings.length; r++) {
      var ring = rings[r];
      var offset = r * 0.72;
      for (var i = 0; i < ring.n; i++) {
        var a = (i / ring.n) * Math.PI * 2 + offset;
        var p = new THREE.Mesh(ring.geo, ring.mat);
        var jitter = (Math.random() - 0.5) * 0.18;
        p.position.set(Math.cos(a) * ring.rad, ring.y, Math.sin(a) * ring.rad);
        p.rotation.order = 'YXZ';
        p.rotation.y = -a + Math.PI / 2;
        p.rotation.x = -ring.tilt + jitter * 0.42;
        p.rotation.z = jitter;
        var sc = ring.sc * (0.92 + Math.random() * 0.16);
        p.scale.setScalar(sc * 0.40);
        g.add(p);
      }
    }

    // sépalos verdes debajo
    var sm = mat(PALETTE.sageDk, 0.85);
    for (var k = 0; k < 5; k++) {
      var ak = (k / 5) * Math.PI * 2;
      var sep = new THREE.Mesh(GEO.leaf, sm);
      sep.position.set(Math.cos(ak) * 0.085, -0.045, Math.sin(ak) * 0.085);
      sep.rotation.order = 'YXZ';
      sep.rotation.y = -ak + Math.PI / 2;
      sep.rotation.x = 0.55;
      sep.scale.setScalar(0.17);
      g.add(sep);
    }

    g.scale.setScalar(size);
    return g;
  }

  /* ---------- margarita ---------- */
  function makeDaisy(size) {
    var g = new THREE.Group();
    var mp = mat(PALETTE.cream[0], 0.62, { emissive: 0xfff6e6, emissiveIntensity: 0.04 });
    var n = 11;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var p = new THREE.Mesh(GEO.petalOut, mp);
      p.position.set(Math.cos(a) * 0.048, 0.004, Math.sin(a) * 0.048);
      p.rotation.order = 'YXZ';
      p.rotation.y = -a + Math.PI / 2;
      p.rotation.x = -0.34 + (Math.random() - 0.5) * 0.16;
      p.scale.set(0.15, 0.33, 0.22);
      g.add(p);
    }
    var core = new THREE.Mesh(GEO.bud, mat(PALETTE.gold, 0.55, { emissive: PALETTE.gold, emissiveIntensity: 0.18 }));
    core.scale.set(0.045, 0.028, 0.045);
    core.position.y = 0.022;
    g.add(core);
    g.scale.setScalar(size);
    return g;
  }

  /* ---------- nube de flor pequeña (paniculata) ---------- */
  function makeBaby(size, color) {
    var g = new THREE.Group();
    var m = mat(color, 0.62, { emissive: color, emissiveIntensity: 0.08 });
    var n = 9;
    for (var i = 0; i < n; i++) {
      var b = new THREE.Mesh(GEO.bud, m);
      b.position.set(
        (Math.random() - 0.5) * 0.16,
        (Math.random() - 0.5) * 0.13,
        (Math.random() - 0.5) * 0.16
      );
      b.scale.setScalar(0.019 + Math.random() * 0.017);
      g.add(b);
    }
    g.scale.setScalar(size);
    return g;
  }

  /* ---------- hoja ---------- */
  function makeLeaf(size) {
    var l = new THREE.Mesh(GEO.leaf, mat(Math.random() > 0.5 ? PALETTE.sage : PALETTE.sageDk, 0.86));
    l.scale.set(size * 0.5, size, size * 0.7);
    return l;
  }

  /* ---------- tallo ---------- */
  function makeStem(from, len, tilt, rotY) {
    var s = new THREE.Mesh(GEO.stem, mat(PALETTE.sageDk, 0.9));
    s.scale.y = len;
    s.position.copy(from);
    s.rotation.order = 'YXZ';
    s.rotation.y = rotY;
    s.rotation.x = tilt;
    return s;
  }

  /* ---------- papel kraft ---------- */
  function makeWrap() {
    var g = new THREE.Group();

    // cono principal (abierto)
    var geo = new THREE.CylinderGeometry(1.12, 0.11, 1.70, 26, 3, true);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      var ang = Math.atan2(z, x);
      var fold = 1 + Math.sin(ang * 7) * 0.045 + Math.sin(ang * 13) * 0.02;
      var t = (y + 0.85) / 1.70;
      pos.setX(i, x * fold);
      pos.setZ(i, z * fold);
      pos.setY(i, y + Math.sin(ang * 7) * 0.035 * t);
    }
    geo.computeVertexNormals();

    var paper = mat(PALETTE.kraft, 0.94);
    paper.side = THREE.DoubleSide;
    var cone = new THREE.Mesh(geo, paper);
    cone.position.y = -0.28;
    g.add(cone);

    // capa interior más oscura para dar profundidad
    var inner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.99, 0.10, 1.56, 22, 1, true),
      mat(PALETTE.kraftD, 0.96)
    );
    inner.position.y = -0.28;
    g.add(inner);

    // collar superior doblado
    var collar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.10, 0.98, 0.16, 26, 1, true),
      mat(0xfbc3d8, 0.92)
    );
    collar.position.y = 0.34;
    g.add(collar);

    return g;
  }

  /* ---------- lazo verde ---------- */
  function makeRibbon() {
    var g = new THREE.Group();
    var rm = mat(0xb08ada, 0.66, { emissive: 0xb08ada, emissiveIntensity: 0.04 });

    var band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 10, 32), rm);
    band.rotation.x = Math.PI / 2;
    band.position.y = -0.62;
    band.scale.set(1, 1, 0.72);
    g.add(band);

    // dos lazadas
    for (var i = 0; i < 2; i++) {
      var loop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 22), rm);
      loop.position.set(i === 0 ? -0.26 : 0.26, -0.58, 0.20);
      loop.rotation.set(0.35, i === 0 ? -0.5 : 0.5, i === 0 ? 0.5 : -0.5);
      loop.scale.set(1, 0.7, 0.55);
      g.add(loop);
    }

    // colas
    for (var j = 0; j < 2; j++) {
      var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.012, 0.46, 6), rm);
      tail.position.set(j === 0 ? -0.14 : 0.14, -0.86, 0.24);
      tail.rotation.z = j === 0 ? 0.34 : -0.34;
      tail.rotation.x = -0.22;
      g.add(tail);
    }
    return g;
  }

  /* ---------- destellos ---------- */
  function makeSparkles() {
    var g = new THREE.Group();
    var m = new THREE.MeshBasicMaterial({ color: 0xf7dc8e, transparent: true, opacity: 0.0 });
    var geo = new THREE.SphereGeometry(1, 6, 5);
    for (var i = 0; i < 26; i++) {
      var s = new THREE.Mesh(geo, m.clone());
      var a = Math.random() * Math.PI * 2;
      var r = 0.9 + Math.random() * 1.5;
      s.position.set(Math.cos(a) * r, -0.3 + Math.random() * 2.4, Math.sin(a) * r * 0.7);
      s.scale.setScalar(0.008 + Math.random() * 0.016);
      s.userData = { base: s.position.y, sp: 0.16 + Math.random() * 0.4, ph: Math.random() * 6.28, amp: 0.5 + Math.random() * 0.9 };
      sparkles.push(s);
      g.add(s);
    }
    return g;
  }

  /* ---------- composición del ramo ---------- */
  function buildBouquet() {
    var g = new THREE.Group();
    g.add(makeWrap());
    g.add(makeRibbon());

    // distribución en domo: anillos concéntricos
    var layout = [
      { n: 1, r: 0.00, y: 1.14, tilt: 0.00, size: 1.05, kinds: ['rose'] },
      { n: 5, r: 0.30, y: 1.06, tilt: 0.26, size: 1.00, kinds: ['rose', 'rose', 'daisy', 'rose', 'rose'] },
      { n: 8, r: 0.58, y: 0.90, tilt: 0.52, size: 0.94, kinds: ['rose', 'daisy', 'rose', 'rose', 'baby', 'rose', 'daisy', 'rose'] },
      { n: 11, r: 0.86, y: 0.70, tilt: 0.80, size: 0.84, kinds: ['rose', 'baby', 'rose', 'daisy', 'rose', 'leaf', 'rose', 'baby', 'rose', 'daisy', 'rose'] },
      { n: 12, r: 1.08, y: 0.50, tilt: 1.05, size: 0.66, kinds: ['leaf', 'rose', 'baby', 'leaf', 'daisy', 'rose', 'leaf', 'baby', 'rose', 'leaf', 'daisy', 'baby'] }
    ];

    var ci = 0;
    for (var L = 0; L < layout.length; L++) {
      var ly = layout[L];
      for (var i = 0; i < ly.n; i++) {
        var a = (i / ly.n) * Math.PI * 2 + L * 0.55;
        var jr = ly.r * (0.9 + Math.random() * 0.2);
        var x = Math.cos(a) * jr;
        var z = Math.sin(a) * jr * 0.82;
        var y = ly.y + (Math.random() - 0.5) * 0.09;
        var kind = ly.kinds[i % ly.kinds.length];

        var obj;
        if (kind === 'rose') {
          obj = makeRose(PALETTE.rose[ci++ % PALETTE.rose.length], ly.size * (0.92 + Math.random() * 0.16));
        } else if (kind === 'daisy') {
          obj = makeDaisy(ly.size * (0.9 + Math.random() * 0.2));
        } else if (kind === 'baby') {
          obj = makeBaby(ly.size * 1.15, Math.random() > 0.5 ? 0xf7ecd9 : 0xe8bfd0);
        } else {
          obj = makeLeaf(0.42 + Math.random() * 0.16);
        }

        obj.position.set(x, y, z);
        obj.rotation.order = 'YXZ';
        obj.rotation.y = Math.random() * Math.PI * 2;
        obj.rotation.x = ly.tilt * (0.85 + Math.random() * 0.3) * (kind === 'leaf' ? 1.5 : 1);
        obj.rotation.z = (Math.random() - 0.5) * 0.3;

        // tallo hacia el centro del lazo
        if (kind !== 'leaf' && kind !== 'baby') {
          var base = new THREE.Vector3(x * 0.16, -0.30, z * 0.16);
          var head = new THREE.Vector3(x, y - 0.06, z);
          var mid = base.clone().add(head).multiplyScalar(0.5);
          var st = makeStem(mid, base.distanceTo(head), 0, 0);
          st.lookAt(head);
          st.rotateX(Math.PI / 2);
          g.add(st);
        }

        // hojas sueltas alrededor de las flores exteriores
        if (L === 3 && Math.random() > 0.5) {
          var lf = makeLeaf(0.34 + Math.random() * 0.14);
          lf.position.set(x * 1.02, y - 0.10, z * 1.02);
          lf.rotation.set(1.25 + Math.random() * 0.4, Math.random() * 6.28, Math.random() * 0.7);
          g.add(lf);
        }

        obj.userData.entry = {
          y: y, sc: obj.scale.x,
          ph: Math.random() * Math.PI * 2,
          sp: 0.5 + Math.random() * 0.6
        };
        flowers.push(obj);
        g.add(obj);
      }
    }

    g.add(makeSparkles());
    return g;
  }

  /* ---------- luces ---------- */
  function addLights() {
    // Sobre fondo claro hace falta más contraste: la clave más marcada
    // y el relleno bajo, si no las flores rosas se lavan.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdcc3cf, 0.38));

    var key = new THREE.DirectionalLight(0xfff6ec, 1.15);
    key.position.set(2.4, 3.6, 3.0);
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xdfeaf6, 0.2);
    fill.position.set(-3.4, 1.0, 2.2);
    scene.add(fill);

    var rim = new THREE.DirectionalLight(0xdcc9f2, 0.34);
    rim.position.set(-1.6, 2.2, -3.4);
    scene.add(rim);

    var warm = new THREE.PointLight(0xf7dc8e, 0.4, 7, 2);
    warm.position.set(0.5, 1.3, 1.9);
    scene.add(warm);

    // relleno frontal: sin él la cara del papel queda a contraluz y se ve gris
    var front = new THREE.DirectionalLight(0xfffaf6, 0.42);
    front.position.set(0.3, 0.8, 4.2);
    scene.add(front);
  }

  /* ---------- interacción ---------- */
  function bindPointer() {
    function down(e) {
      pointer.down = true;
      pointer.lastX = (e.touches ? e.touches[0].clientX : e.clientX);
      canvas.style.cursor = 'grabbing';
    }
    function move(e) {
      if (!pointer.down) return;
      var x = (e.touches ? e.touches[0].clientX : e.clientX);
      var dx = x - pointer.lastX;
      pointer.lastX = x;
      pointer.target += dx * 0.0075;
      pointer.vel = dx * 0.0035;
    }
    function up() { pointer.down = false; canvas.style.cursor = 'grab'; }

    canvas.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', down, { passive: true });
    canvas.addEventListener('touchmove', move, { passive: true });
    canvas.addEventListener('touchend', up);
    canvas.style.cursor = 'grab';
  }

  /* ---------- bucle ---------- */
  function render() {
    raf = requestAnimationFrame(render);
    if (!visible) return;

    var t = clock.getElapsedTime();

    if (!pointer.down) {
      pointer.target += reduce ? 0 : 0.0016 + pointer.vel;
      pointer.vel *= 0.94;
    }
    pointer.current += (pointer.target - pointer.current) * 0.075;
    spin.rotation.y = pointer.current;

    // respiración suave del ramo
    root.position.y = Math.sin(t * 0.62) * 0.045;
    root.rotation.z = Math.sin(t * 0.45) * 0.017;
    root.rotation.x = Math.sin(t * 0.38 + 1) * 0.013;

    // vaivén individual de cada flor
    for (var i = 0; i < flowers.length; i++) {
      var f = flowers[i], d = f.userData.entry;
      if (!d) continue;
      f.position.y = d.y + Math.sin(t * d.sp + d.ph) * 0.017;
      f.rotation.z = Math.sin(t * d.sp * 0.8 + d.ph) * 0.05;
    }

    // destellos
    for (var s = 0; s < sparkles.length; s++) {
      var sp = sparkles[s], u = sp.userData;
      sp.position.y = u.base + Math.sin(t * u.sp + u.ph) * 0.34;
      sp.material.opacity = ready ? (0.18 + Math.sin(t * u.amp * 1.7 + u.ph) * 0.5) * 0.6 : 0;
    }

    renderer.render(scene, camera);
  }

  function fit() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    var narrow = w < 760;
    // en escritorio corremos el ramo a la derecha para dejar sitio al texto;
    // en móvil el texto va debajo, así que va centrado
    var offX = narrow ? 0 : (w >= 1000 ? -0.82 : -0.45);
    var lookY = narrow ? 0.30 : 0.62;

    /* Calculamos la distancia en vez de fijarla a mano: así el ramo
       entra entero sea cual sea la forma del hueco (móvil vertical,
       tablet, escritorio ancho) sin recortar ni quedarse diminuto. */
    var halfH = 1.55;
    var halfW = 1.62 + Math.abs(offX);
    var t = Math.tan((camera.fov * Math.PI / 180) / 2);
    var dist = Math.max(halfH / t, halfW / (t * camera.aspect));

    camera.position.set(offX, lookY + (narrow ? 1.05 : 0), dist);
    camera.lookAt(offX, lookY, 0);
    camera.updateProjectionMatrix();
  }

  /* ---------- API ---------- */
  function init() {
    canvas = document.getElementById('bouquet-canvas');
    if (!canvas || !window.THREE) return false;

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    if ('toneMapping' in renderer) { renderer.toneMapping = THREE.LinearToneMapping; renderer.toneMappingExposure = 1.0; }

    scene = new THREE.Scene();
    // sin niebla: sobre fondo claro sólo lavaba los colores

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.42, 4.5);
    camera.lookAt(0, 0.55, 0);

    clock = new THREE.Clock();
    initGeometries();
    addLights();

    spin = new THREE.Group();
    root = new THREE.Group();
    root.add(buildBouquet());
    spin.add(root);
    scene.add(spin);

    fit();
    bindPointer();
    window.addEventListener('resize', fit);

    // pausar cuando no se ve (batería)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
      }, { threshold: 0.02 }).observe(canvas);
    }

    render();
    return true;
  }

  /* animación de entrada: las flores brotan una a una */
  function bloom() {
    if (!flowers.length) return;
    ready = true;
    if (reduce || !window.gsap) {
      flowers.forEach(function (f) { f.scale.setScalar(f.userData.entry.sc); });
      return;
    }
    flowers.forEach(function (f) { f.scale.setScalar(0.0001); });
    var order = flowers.slice().sort(function (a, b) { return b.position.y - a.position.y; });
    order.forEach(function (f, i) {
      var target = f.userData.entry.sc;
      gsap.to(f.scale, {
        x: target, y: target, z: target,
        duration: 1.15, ease: 'elastic.out(1, 0.62)',
        delay: 0.05 + i * 0.045
      });
      gsap.from(f.rotation, {
        y: f.rotation.y - 1.5, duration: 1.3,
        ease: 'power3.out', delay: 0.05 + i * 0.045
      });
    });
    gsap.from(pointer, { target: pointer.target - 1.1, duration: 3.2, ease: 'power2.out' });
  }

  return { init: init, bloom: bloom };
})();
