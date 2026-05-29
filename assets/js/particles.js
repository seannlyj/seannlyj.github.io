"use strict";

(function () {
  const canvas = document.getElementById("particle-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CONNECT_DIST = 130;
  const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST;
  const SPEED = 0.35;
  const RADIUS = 1.5;
  const DOT_COLOR = "hsla(220, 10%, 65%, 0.55)";
  const LINE_MAX_ALPHA = 0.22;

  let dpr, W, H, particles;
  let rafId = null;

  function getCount() {
    return window.innerWidth <= 760 ? 30 : 55;
  }

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : (Math.random() < 0.5 ? 0 : H);
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * SPEED;
      this.vy = Math.sin(angle) * SPEED;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx); }
      else if (this.x > W) { this.x = W; this.vx = -Math.abs(this.vx); }
      if (this.y < 0) { this.y = 0; this.vy = Math.abs(this.vy); }
      else if (this.y > H) { this.y = H; this.vy = -Math.abs(this.vy); }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = DOT_COLOR;
      ctx.fill();
    }
  }

  function drawLines() {
    for (let i = 0; i < particles.length - 1; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CONNECT_DIST_SQ) {
          const alpha = LINE_MAX_ALPHA * (1 - Math.sqrt(d2) / CONNECT_DIST);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `hsla(220, 10%, 50%, ${alpha.toFixed(3)})`;
          ctx.stroke();
        }
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (!reducedMotion) particles.forEach((p) => p.update());
    particles.forEach((p) => p.draw());
    drawLines();
  }

  function loop() {
    render();
    rafId = requestAnimationFrame(loop);
  }

  function init() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 1;
    particles = Array.from({ length: getCount() }, () => new Particle());
  }

  init();

  if (reducedMotion) {
    render();
    return;
  }

  loop();

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
    resizeTimer = setTimeout(() => {
      cancelAnimationFrame(rafId);
      rafId = null;
      init();
      loop();
    }, 150);
  }, { passive: true });
})();
