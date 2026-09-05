/* ============================================================
   MAIN — sobre, intro, scroll, música
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.CONFIG || {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!window.gsap;
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ==========================================================
     UTILIDADES
     ========================================================== */

  // normaliza: minúsculas, sin acentos, sin espacios ni signos
  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  // parte un elemento en <span class="char"> conservando el HTML interno básico
  function splitChars(el) {
    if (el.dataset.split === '1') return $$('.char', el);
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      if (!node.nodeValue.trim()) return;
      var frag = document.createDocumentFragment();
      node.nodeValue.split('').forEach(function (ch) {
        if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
        var s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    el.dataset.split = '1';
    return $$('.char', el);
  }

  function splitWords(el) {
    if (el.dataset.split === '1') return $$('.word', el);
    $$('p', el).forEach(function (p) {
      var html = p.innerHTML.split(/(\s+)/).map(function (tok) {
        if (!tok.trim()) return tok;
        return '<span class="word">' + tok + '</span>';
      }).join('');
      p.innerHTML = html;
    });
    el.dataset.split = '1';
    return $$('.word', el);
  }

  /* ==========================================================
     MÚSICA
     ========================================================== */
  var Music = (function () {
    var audio = $('#local-audio');
    var player = $('#player');
    var btn = $('#player-btn');
    var vinyl = $('#vinyl');
    var spotifyCtl = null;
    var mode = null;          // 'local' | 'spotify' | null
    var playing = false;

    function setPlaying(v) {
      playing = v;
      player.classList.toggle('is-playing', v);
      if (vinyl) vinyl.classList.toggle('is-spin', v);
    }

    // ¿existe el mp3 local?
    function probeLocal() {
      return new Promise(function (res) {
        if (!audio || !CFG.localAudio) return res(false);
        var done = false;
        var t = setTimeout(function () { if (!done) { done = true; res(false); } }, 2500);
        audio.addEventListener('canplay', function () {
          if (!done) { done = true; clearTimeout(t); res(true); }
        }, { once: true });
        audio.addEventListener('error', function () {
          if (!done) { done = true; clearTimeout(t); res(false); }
        }, { once: true });
        audio.preload = 'auto';
        audio.load();
      });
    }

    // API del iframe de Spotify (permite play/pause desde el botón)
    function loadSpotifyAPI() {
      return new Promise(function (res) {
        if (window.SpotifyIframeApi) return res(window.SpotifyIframeApi);
        var s = document.createElement('script');
        s.src = 'https://open.spotify.com/embed/iframe-api/v1';
        s.async = true;
        var settled = false;
        window.onSpotifyIframeApiReady = function (api) {
          if (!settled) { settled = true; res(api); }
        };
        s.onerror = function () { if (!settled) { settled = true; res(null); } };
        setTimeout(function () { if (!settled) { settled = true; res(null); } }, 6000);
        document.head.appendChild(s);
      });
    }

    function initSpotify() {
      return loadSpotifyAPI().then(function (api) {
        if (!api) return false;
        var el = $('#spotify-embed');
        if (!el) return false;
        return new Promise(function (res) {
          try {
            api.createController(el, {
              uri: 'spotify:track:' + (CFG.spotifyTrackId || ''),
              width: '100%', height: 152
            }, function (ctl) {
              spotifyCtl = ctl;
              ctl.addListener('playback_update', function (e) {
                if (e && e.data) setPlaying(!e.data.isPaused);
              });
              res(true);
            });
            setTimeout(function () { res(!!spotifyCtl); }, 4000);
          } catch (err) { res(false); }
        });
      });
    }

    // arranca tras el gesto de abrir el sobre
    function start() {
      player.classList.add('is-on');
      player.setAttribute('aria-hidden', 'false');

      return probeLocal().then(function (ok) {
        if (ok) {
          mode = 'local';
          audio.volume = 0;
          var p = audio.play();
          if (p && p.catch) p.catch(function () { setPlaying(false); });
          setPlaying(true);
          // fundido de entrada
          if (hasGSAP) gsap.to(audio, { volume: 0.55, duration: 3.5, ease: 'power1.inOut' });
          else audio.volume = 0.55;
          return;
        }
        mode = 'spotify';
        return initSpotify().then(function (ready) {
          if (ready && spotifyCtl) {
            try { spotifyCtl.play(); setPlaying(true); } catch (e) { setPlaying(false); }
          } else {
            setPlaying(false);
          }
        });
      });
    }

    function toggle() {
      if (mode === 'local' && audio) {
        if (audio.paused) { audio.play(); setPlaying(true); }
        else { audio.pause(); setPlaying(false); }
        return;
      }
      if (spotifyCtl) {
        try { spotifyCtl.togglePlay(); } catch (e) {}
        setPlaying(!playing);
        return;
      }
      // sin control: llevamos a la sección de la canción
      var sec = $('#sec-song');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // pausa sea cual sea la fuente (mp3 local o Spotify)
    function pause() {
      if (mode === 'local' && audio && !audio.paused) audio.pause();
      else if (spotifyCtl) { try { spotifyCtl.pause(); } catch (e) {} }
      setPlaying(false);
    }

    if (btn) btn.addEventListener('click', toggle);

    return { start: start, toggle: toggle, pause: pause };
  })();

  /* ==========================================================
     GATE
     ========================================================== */
  var Gate = (function () {
    var gate = $('#gate');
    var form = $('#gate-form');
    var input = $('#gate-input');
    var err = $('#gate-error');
    var eye = $('#gate-eye');
    var hintBtn = $('#gate-hint-btn');
    var hint = $('#gate-hint');
    var tries = 0;
    var KEY = 'reina:unlocked';

    var MSGS = [
      'Mmm… esa no es. Inténtalo otra vez 🤍',
      'Casi… piensa en cómo te llamo yo.',
      'Tranquila, tú puedes. Toca "¿Una pista?" 🌸'
    ];

    function valid(v) {
      var list = (CFG.passwords || []).map(norm);
      return list.indexOf(norm(v)) !== -1;
    }

    function fail() {
      tries++;
      err.textContent = MSGS[Math.min(tries - 1, MSGS.length - 1)];
      err.classList.add('is-on');
      gate.classList.remove('shake');
      void gate.offsetWidth;
      gate.classList.add('shake');
      input.value = '';
      input.focus();
      if (tries >= 2 && hint) reveal();
    }

    function reveal() {
      hint.textContent = CFG.hint || '';
      hint.classList.add('is-on');
    }

    function open() {
      err.classList.remove('is-on');
      err.textContent = '';
      if (CFG.rememberUnlock) { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }

      // La música arranca aquí: este clic es el gesto que piden los navegadores.
      Music.start();

      document.body.classList.remove('is-locked');
      document.body.classList.add('no-scroll');

      var tl = hasGSAP ? gsap.timeline() : null;
      if (!tl) { gate.style.display = 'none'; Intro.play(); return; }

      tl.to('.gate__inner', { scale: 0.94, opacity: 0, duration: 0.55, ease: 'power3.in' })
        .to('.gate__frame', { scale: 1.7, opacity: 0, duration: 0.9, ease: 'power3.inOut' }, '-=0.35')
        .to(gate, {
          opacity: 0, duration: 0.7, ease: 'power2.inOut',
          onComplete: function () {
            gate.style.display = 'none';
            if (window.Petals) window.Petals.stop();
            Intro.play();
          }
        }, '-=0.6');
    }

    function bind() {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (valid(input.value)) open(); else fail();
      });

      input.addEventListener('input', function () {
        if (err.classList.contains('is-on')) err.classList.remove('is-on');
      });

      eye.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        eye.classList.toggle('is-on', show);
        input.focus();
      });

      hintBtn.addEventListener('click', reveal);

      // entrada elegante
      if (hasGSAP && !reduce) {
        var entry = gsap.timeline();
        entry.from('.gate__frame', { scale: 0.94, opacity: 0, duration: 1.2, ease: 'power3.out' }, 0)
             .from('.gate__inner > *', {
               y: 26, opacity: 0, duration: 1, stagger: 0.09, ease: 'power3.out'
             }, 0.25);
        // red de seguridad: si el navegador congela las animaciones
        // (pestaña en segundo plano) nada puede quedarse invisible
        setTimeout(function () {
          if (entry.progress() < 1) entry.progress(1);
        }, 4000);
      }

      setTimeout(function () { input.focus(); }, 700);
    }

    function alreadyOpen() {
      if (!CFG.rememberUnlock) return false;
      try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; }
    }

    return { bind: bind, alreadyOpen: alreadyOpen, open: open };
  })();

  /* ==========================================================
     INTRO CINEMÁTICO
     ========================================================== */
  var Intro = (function () {
    var intro = $('#intro');
    var skip = $('#skip-intro');
    var tl = null;
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      if (tl) tl.kill();
      if (hasGSAP) {
        gsap.to(intro, {
          opacity: 0, duration: 0.8, ease: 'power2.inOut',
          onComplete: function () {
            intro.classList.remove('is-on');
            intro.style.display = 'none';
            Story.enter();
          }
        });
      } else {
        intro.style.display = 'none';
        Story.enter();
      }
    }

    function play() {
      if (reduce || !hasGSAP) { intro.style.display = 'none'; Story.enter(); return; }

      intro.classList.add('is-on');
      intro.setAttribute('aria-hidden', 'false');
      var D = CFG.introDuration || 1;

      tl = gsap.timeline({ onComplete: finish });

      var ph = function (n) { return '.film-photo[data-photo="' + n + '"]'; };
      var cap = function (n) { return '[data-cap="' + n + '"]'; };

      // — escena 1 —
      tl.to(ph(1), { opacity: 1, scale: 1.02, duration: 3.0 * D, ease: 'power2.out' })
        .fromTo(cap(1) + ' span',
          { opacity: 0, y: 34, filter: 'blur(14px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.5 * D, ease: 'power3.out' }, 0.5 * D)
        .to('.light-leak', { opacity: 0.55, duration: 1.2 * D, ease: 'sine.inOut' }, 0.3 * D)
        .to('.light-leak', { opacity: 0.1, duration: 1.4 * D, ease: 'sine.inOut' }, 1.6 * D)
        .to(cap(1) + ' span', { opacity: 0, y: -22, filter: 'blur(10px)', duration: 0.9 * D, ease: 'power2.in' }, 2.5 * D)
        .to(ph(1), { opacity: 0, duration: 0.9 * D, ease: 'power2.inOut' }, 2.7 * D)

        // — escena 2 —
        .fromTo(ph(2), { opacity: 0, scale: 1.16 }, { opacity: 1, scale: 1.02, duration: 3.0 * D, ease: 'power2.out' }, 3.0 * D)
        .fromTo(cap(2) + ' span',
          { opacity: 0, y: 34, filter: 'blur(14px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4 * D, ease: 'power3.out' }, 3.4 * D)
        .to(cap(2) + ' span', { opacity: 0, y: -22, filter: 'blur(10px)', duration: 0.9 * D, ease: 'power2.in' }, 5.3 * D)
        .to(ph(2), { opacity: 0, duration: 0.9 * D, ease: 'power2.inOut' }, 5.5 * D)

        // — escena 3 —
        .fromTo(ph(3), { opacity: 0, scale: 1.18 }, { opacity: 1, scale: 1.03, duration: 3.4 * D, ease: 'power2.out' }, 5.8 * D)
        .fromTo(cap(3) + ' span',
          { opacity: 0, scale: 0.86, filter: 'blur(16px)' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.8 * D, ease: 'power3.out' }, 6.2 * D)
        .to('.light-leak', { opacity: 0.6, duration: 1.4 * D, ease: 'sine.inOut' }, 6.6 * D)
        .to('.light-leak', { opacity: 0.12, duration: 1.4 * D, ease: 'sine.inOut' }, 8.0 * D)
        .to(cap(3) + ' span', { opacity: 0, scale: 1.1, filter: 'blur(12px)', duration: 1.0 * D, ease: 'power2.in' }, 8.4 * D)
        .to(ph(3), { opacity: 0, duration: 1.0 * D, ease: 'power2.inOut' }, 8.5 * D)

        // — título —
        .fromTo(ph(4), { opacity: 0, scale: 1.2 }, { opacity: 0.62, scale: 1.04, duration: 4.0 * D, ease: 'power2.out' }, 9.0 * D)
        .to(cap(4), { opacity: 1, duration: 0.1 }, 9.3 * D)
        .fromTo('.film-title__small',
          { opacity: 0, y: 18, letterSpacing: '1.1em' },
          { opacity: 1, y: 0, letterSpacing: '0.5em', duration: 1.8 * D, ease: 'power3.out' }, 9.4 * D)
        .fromTo('.film-title__big',
          { opacity: 0, y: 46, filter: 'blur(20px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 2.0 * D, ease: 'power3.out' }, 9.8 * D)
        .to('.light-leak', { opacity: 0.5, duration: 1.6 * D, ease: 'sine.inOut' }, 10.4 * D)
        .to({}, { duration: 1.6 * D })
        .to(['.film-title', ph(4), '.light-leak'], { opacity: 0, duration: 1.2 * D, ease: 'power2.inOut' });

      skip.addEventListener('click', finish);
      window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === ' ') finish();
      });
    }

    return { play: play, finish: finish };
  })();

  /* ==========================================================
     STORY (scroll)
     ========================================================== */
  var Story = (function () {
    var story = $('#story');
    var progress = $('#progress');
    var entered = false;

    function buildScrollAnims() {
      if (!hasGSAP || !window.ScrollTrigger) return;

      // Si el sistema pide menos movimiento, no animamos nada:
      // el contenido se ve tal cual, sin esperar a ningún trigger.
      if (reduce) {
        if (progress) progress.classList.add('is-on');
        return;
      }

      // títulos letra por letra
      $$('[data-anim="chars"]').forEach(function (el) {
        var chars = splitChars(el);
        gsap.from(chars, {
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          y: 48, opacity: 0, rotateX: -55, filter: 'blur(8px)',
          duration: 0.95, ease: 'power3.out', stagger: 0.022
        });
      });

      // fades genéricos
      $$('[data-anim="fade"]').forEach(function (el) {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          y: 30, opacity: 0, duration: 1, ease: 'power3.out'
        });
      });

      // fotos
      $$('[data-anim="ph"]').forEach(function (el, i) {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          y: 60, opacity: 0, scale: 0.94,
          duration: 1.1, ease: 'power3.out', delay: (i % 3) * 0.08
        });
      });

      // la carta: se despliega y el texto aparece palabra por palabra
      var letter = $('.letter');
      if (letter) {
        gsap.from(letter, {
          scrollTrigger: { trigger: letter, start: 'top 88%', once: true },
          rotateX: -18, y: 70, opacity: 0, scale: 0.96,
          transformPerspective: 1200,
          duration: 1.5, ease: 'power3.out'
        });
        var words = splitWords($('#letter-body'));
        gsap.from(words, {
          scrollTrigger: { trigger: letter, start: 'top 72%', once: true },
          opacity: 0, y: 14, filter: 'blur(6px)',
          duration: 0.6, ease: 'power2.out', stagger: 0.012
        });
      }

      // parallax suave en el ramo
      var bq = $('#sec-bouquet');
      if (bq) {
        gsap.to('.bouquet__ui', {
          scrollTrigger: { trigger: bq, start: 'top top', end: 'bottom top', scrub: 0.6 },
          y: -80, opacity: 0, ease: 'none'
        });
      }

      // barra de progreso
      if (progress) {
        progress.classList.add('is-on');
        gsap.to(progress.querySelector('i'), {
          scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
          width: '100%', ease: 'none'
        });
      }

      // corazón final
      var end = $('#sec-end');
      if (end) {
        gsap.from('#end-heart', {
          scrollTrigger: { trigger: end, start: 'top 70%', once: true },
          scale: 0, opacity: 0, duration: 1.4, ease: 'elastic.out(1,0.6)'
        });
      }

      ScrollTrigger.refresh();
    }

    function enter() {
      if (entered) return;
      entered = true;

      document.body.classList.remove('no-scroll', 'is-locked');
      story.classList.add('is-on');
      story.setAttribute('aria-hidden', 'false');
      window.scrollTo(0, 0);

      // arranca el ramo 3D
      if (window.Bouquet) {
        var ok = window.Bouquet.init();
        if (ok) setTimeout(function () { window.Bouquet.bloom(); }, 350);
      }

      if (hasGSAP) {
        gsap.fromTo(story, { opacity: 0 }, {
          opacity: 1, duration: 1.2, ease: 'power2.out',
          // soltamos la capa de composición al acabar
          onComplete: function () { gsap.set(story, { clearProps: 'opacity,willChange' }); }
        });
      }

      buildScrollAnims();
      Book.init();
      Extras.init();
    }

    return { enter: enter };
  })();


  /* ==========================================================
     LIBRO DE RECUERDOS
     ========================================================== */
  var Book = (function () {
    var wrap, book, leaves, prevBtn, nextBtn, hint;
    var cur = 0;          // 0 = cerrado; n = n hojas pasadas
    var total = 0;
    var busy = false;

    function render() {
      for (var i = 0; i < total; i++) {
        var flipped = i < cur;
        leaves[i].classList.toggle('is-flipped', flipped);
        // la hoja recién pasada debe quedar por encima de las anteriores
        leaves[i].style.zIndex = flipped ? (i + 1) : (total - i);
      }
      var open = cur > 0;
      book.classList.toggle('is-open', open);
      wrap.classList.toggle('is-open', open);
      prevBtn.disabled = cur === 0;
      nextBtn.disabled = cur >= total - 1;
      if (hint) hint.style.opacity = open ? '0' : '';
      book.setAttribute('aria-label',
        open ? ('Libro abierto, hoja ' + cur + ' de ' + (total - 1)) : 'Libro de recuerdos cerrado');
    }

    function go(n) {
      var next = Math.max(0, Math.min(total - 1, n));
      if (next === cur || busy) return;
      cur = next;
      busy = true;
      render();
      // el ancho del libro y el giro tardan ~.95s
      setTimeout(function () { busy = false; }, 620);
    }

    function next() { go(cur + 1); }
    function prev() { go(cur - 1); }

    function bind() {
      // click en el libro: mitad derecha avanza, mitad izquierda retrocede
      book.addEventListener('click', function (e) {
        if (e.target.closest('.book__nav')) return;
        var r = book.getBoundingClientRect();
        if (cur === 0) { next(); return; }
        if (e.clientX - r.left < r.width / 2 && r.width > 400) prev();
        else next();
      });

      nextBtn.addEventListener('click', function (e) { e.stopPropagation(); next(); });
      prevBtn.addEventListener('click', function (e) { e.stopPropagation(); prev(); });

      // teclado
      window.addEventListener('keydown', function (e) {
        if (!isInView()) return;
        if (e.key === 'ArrowRight') next();
        else if (e.key === 'ArrowLeft') prev();
      });

      // swipe
      var sx = null, sy = null;
      book.addEventListener('touchstart', function (e) {
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      book.addEventListener('touchend', function (e) {
        if (sx === null) return;
        var dx = e.changedTouches[0].clientX - sx;
        var dy = e.changedTouches[0].clientY - sy;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) next(); else prev();
        }
        sx = sy = null;
      });
    }

    function isInView() {
      var r = book.getBoundingClientRect();
      return r.top < window.innerHeight * 0.8 && r.bottom > window.innerHeight * 0.2;
    }

    // las flechas se colocan a los lados del libro, sea cual sea su ancho
    function place() {
      var w = book.getBoundingClientRect().width;
      wrap.style.setProperty('--nav-off', (w / 2 + 34) + 'px');
    }

    function init() {
      wrap = $('.book-wrap');
      book = $('#book');
      if (!wrap || !book) return;
      leaves = $$('.leaf', book);
      total = leaves.length;
      prevBtn = $('#book-prev');
      nextBtn = $('#book-next');
      hint = $('#book-hint');

      render();
      bind();
      place();
      window.addEventListener('resize', place);
      // el ancho cambia al abrir/cerrar
      book.addEventListener('transitionend', function (e) {
        if (e.propertyName === 'width') place();
      });
    }

    return { init: init };
  })();

  /* ==========================================================
     EXTRAS: youtube, videos, botón "otra vez"
     ========================================================== */
  var Extras = (function () {
    var done = false;

    function youtube() {
      var frame = $('#yt-frame');
      var btn = $('#yt-play');
      if (!frame || !CFG.youtubeId) return;

      frame.style.backgroundImage = "url('https://i.ytimg.com/vi/" + CFG.youtubeId + "/maxresdefault.jpg')";

      function load() {
        if (frame.classList.contains('is-live')) return;
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + CFG.youtubeId +
                '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
        f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        f.allowFullscreen = true;
        f.title = 'Video';
        frame.classList.add('is-live');
        if (btn) btn.style.display = 'none';
        frame.appendChild(f);
      }

      frame.addEventListener('click', load);
    }

    // si el mp4 no existe, mostramos un marco bonito en su lugar;
    // y si existe, se pone en marcha solo al entrar en pantalla
    function videos() {
      var all = $$('.vidcard video');
      var items = [];

      // al quitar el silencio a un video, callamos la música y el otro video
      function soloAudio(v) {
        Music.pause();
        all.forEach(function (o) {
          if (o !== v) {
            o.muted = true;
            var b = $('.vid-sound[data-for="' + o.id + '"]');
            if (b) b.classList.remove('is-hidden');
          }
        });
      }

      all.forEach(function (v) {
        var ph = $('.vidcard__empty[data-for="' + v.id + '"]');
        var sound = $('.vid-sound[data-for="' + v.id + '"]');
        var missing = false;

        function miss() {
          if (missing) return;
          missing = true;
          if (ph) ph.classList.add('is-on');
          if (sound) sound.style.display = 'none';
          v.style.display = 'none';
          v.removeAttribute('controls');
        }

        // El <video> empieza a cargar con la página, así que el fallo
        // puede haber ocurrido ya antes de llegar aquí: comprobamos el
        // estado ahora mismo, además de escuchar por si llega después.
        function check() {
          if (v.error || v.networkState === 3) miss();
        }
        var src = v.querySelector('source');
        if (src) src.addEventListener('error', miss);
        v.addEventListener('error', miss);
        check();
        setTimeout(check, 2500);

        items.push({ v: v, isMissing: function () { return missing; } });

        if (sound) {
          sound.addEventListener('click', function (e) {
            e.preventDefault();
            v.muted = false;
            v.dataset.unmuted = '1';
            v.volume = 1;
            soloAudio(v);
            sound.classList.add('is-hidden');
            var pr = v.play();
            if (pr && pr.catch) pr.catch(function () {});
          });
        }

        // si lo desactiva desde los controles nativos, mantenemos todo en orden
        v.addEventListener('volumechange', function () {
          if (!v.muted) {
            v.dataset.unmuted = '1';
            soloAudio(v);
            if (sound) sound.classList.add('is-hidden');
          } else if (sound && !missing) {
            sound.classList.remove('is-hidden');
          }
        });
      });

      /* --- se ponen en marcha solos al entrar en pantalla ---
         Van en silencio: los navegadores no dejan sonar sin permiso,
         y además ya está sonando la canción. El botón "Sonido" lo activa.
         Medimos contra la parte visible de la tarjeta, no contra su alto
         total, para que también funcione cuando el video es más alto
         que la pantalla (móviles). */
      function visibleEnough(el, frac) {
        var r = el.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        if (!r.height || r.bottom <= 0 || r.top >= vh) return false;
        var shown = Math.min(r.bottom, vh) - Math.max(r.top, 0);
        return shown / Math.min(r.height, vh) >= frac;
      }

      function update() {
        for (var i = 0; i < items.length; i++) {
          var v = items[i].v;
          if (items[i].isMissing()) continue;
          if (visibleEnough(v, 0.35)) {
            v.loop = true;
            if (v.dataset.unmuted !== '1') v.muted = true;
            if (v.paused) {
              var pr = v.play();
              if (pr && pr.catch) pr.catch(function () {});
            }
          } else if (!v.paused) {
            v.pause();
          }
        }
      }

      // Limitamos por tiempo y no con requestAnimationFrame: si la pestaña
      // está en segundo plano rAF se congela y el control se quedaría colgado.
      var last = 0, timer = null;
      function onScroll() {
        var now = Date.now();
        if (now - last > 120) { last = now; update(); return; }
        clearTimeout(timer);
        timer = setTimeout(function () { last = Date.now(); update(); }, 130);
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      update();
      setTimeout(update, 800);   // por si los metadatos tardan

      videos.update = update;    // para poder forzarlo desde fuera
    }

    function again() {
      var b = $('#btn-again');
      if (!b) return;
      b.addEventListener('click', function () {
        try { sessionStorage.removeItem('reina:unlocked'); } catch (e) {}
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(function () { location.reload(); }, 650);
      });
    }

    function init() {
      if (done) return;
      done = true;
      youtube(); videos(); again();
    }

    return { init: init };
  })();

  /* ==========================================================
     ARRANQUE
     ========================================================== */
  function boot() {
    Gate.bind();

    // si ya abrió el sobre en esta sesión, saltamos directo
    if (Gate.alreadyOpen() && CFG.skipIntroOnReturn) {
      var g = $('#gate');
      g.style.display = 'none';
      if (window.Petals) window.Petals.stop();
      $('#intro').style.display = 'none';
      document.body.classList.remove('is-locked');
      Story.enter();
      // la música necesita un gesto: la activamos al primer toque
      var once = function () {
        Music.start();
        window.removeEventListener('pointerdown', once);
        window.removeEventListener('keydown', once);
      };
      window.addEventListener('pointerdown', once, { once: true });
      window.addEventListener('keydown', once, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
