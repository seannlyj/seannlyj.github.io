"use strict";

(function () {
  const canvas = document.getElementById("fx-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TRAIL_LIFETIME  = 380;  // ms
  const TRAIL_MAX_ALPHA = 0.28;
  const SPEED_MIN       = 10;   // px between events — below this, no trail
  const SPEED_MAX       = 35;   // px — above this, trail at full alpha
  const MAX_SEGMENTS    = 60;   // cap memory
  const RING_DURATION   = 480;  // ms
  const RING_START_R    = 6;
  const RING_END_R      = 58;

  let dpr, W, H;
  let segments = [];  // { x1, y1, x2, y2, alpha, born }
  let rings     = [];  // { x, y, born }
  let lastX = -1, lastY = -1;
  let rafId = null;

  function setupCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function onMove(x, y) {
    if (lastX < 0) { lastX = x; lastY = y; return; }
    const dx = x - lastX;
    const dy = y - lastY;
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed >= SPEED_MIN && !reducedMotion) {
      const t = Math.min((speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN), 1);
      if (segments.length < MAX_SEGMENTS) {
        segments.push({ x1: lastX, y1: lastY, x2: x, y2: y, alpha: TRAIL_MAX_ALPHA * t, born: Date.now() });
      }
    }

    lastX = x;
    lastY = y;
  }

  function spawnRing(x, y) {
    rings.push({ x, y, born: Date.now() });
  }

  function loop() {
    const now = Date.now();
    ctx.clearRect(0, 0, W, H);

    segments = segments.filter((seg) => {
      const progress = (now - seg.born) / TRAIL_LIFETIME;
      if (progress >= 1) return false;
      const ease = 1 - progress * progress;  // quadratic ease-out
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle = `hsla(220,10%,40%,${(seg.alpha * ease).toFixed(3)})`;
      ctx.lineWidth = 1.5 * ease;
      ctx.stroke();
      return true;
    });

    rings = rings.filter((ring) => {
      const progress = (now - ring.born) / RING_DURATION;
      if (progress >= 1) return false;
      const ease = 1 - progress;  // linear fade
      const r = RING_START_R + (RING_END_R - RING_START_R) * progress;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(220,10%,40%,${(0.38 * ease).toFixed(3)})`;
      ctx.lineWidth = 1.5 * ease;
      ctx.stroke();
      return true;
    });

    rafId = requestAnimationFrame(loop);
  }

  setupCanvas();
  loop();

  document.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));

  document.addEventListener("click", (e) => spawnRing(e.clientX, e.clientY));
  document.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    lastX = t.clientX;
    lastY = t.clientY;
    spawnRing(t.clientX, t.clientY);
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      loop();
    }
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setupCanvas, 150);
  }, { passive: true });
})();
