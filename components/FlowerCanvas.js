import { useEffect, useRef, forwardRef } from 'react';

const FlowerCanvas = forwardRef(function FlowerCanvas({ colors, animationKey, onAnimationComplete }, ref) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);



  // Draw static flower (no animation) whenever colors change but animationKey hasn't
  useEffect(() => {
    if (!colors || colors.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawFlowerFrame(canvas, colors, 1);
  }, [colors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run bloom animation whenever animationKey increments
  useEffect(() => {
    if (!animationKey || !colors || colors.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const duration = 2200;
    const start = performance.now();
    let active = true;

    function tick(now) {
      if (!active) return;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      drawFlowerFrame(canvas, colors, eased);
      if (t < 1) {
        animationRef.current = requestAnimationFrame(tick);
      } else {
        onAnimationComplete?.();
      }
    }

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [animationKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={520}
      height={520}
      style={{ borderRadius: '20px', display: 'block', maxWidth: '100%', height: 'auto' }}
    />
  );
});

// ─── Pure drawing function (no React deps) ───────────────────────────────────

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function drawFlowerFrame(canvas, colors, progress) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2;

  ctx.clearRect(0, 0, W, H);

  // ── Background ──
  ctx.fillStyle = '#0d0d0f';
  ctx.fillRect(0, 0, W, H);
  const c1 = hexToRgb(colors[0]);
  const c2 = hexToRgb(colors[colors.length - 1]);
  const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, W * 0.8);
  bgGrad.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},0.13)`);
  bgGrad.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b},0.05)`);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Noise dots (static seed so they don't flicker each frame)
  const rng = mulberry32(42);
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(rng() * W, rng() * H, rng() * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.12})`;
    ctx.fill();
  }

  // ── Stem (grows first, 0→0.35 of progress) ──
  const stemP = easeOut(remap(progress, 0, 0.35, 0, 1));
  if (stemP > 0) {
    const stemEndY = cy + 185;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy + 20);
    ctx.bezierCurveTo(
      cx + 16, cy + 60,
      cx - 12, cy + 120,
      cx, cy + 20 + (stemEndY - cy - 20) * stemP
    );
    const sg = ctx.createLinearGradient(cx, cy, cx, stemEndY);
    sg.addColorStop(0, '#4a7c59');
    sg.addColorStop(1, '#2a5438');
    ctx.strokeStyle = sg;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Leaf appears at stemP > 0.6
    if (stemP > 0.6) {
      const lp = easeOut((stemP - 0.6) / 0.4);
      const leafY = cy + 115;
      ctx.beginPath();
      ctx.moveTo(cx + 2, leafY);
      ctx.bezierCurveTo(cx + 38 * lp, leafY - 20 * lp, cx + 42 * lp, leafY + 6, cx + 2, leafY + 12);
      ctx.fillStyle = '#3d7a4f';
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Outer petals (0.15→0.7) — each petal fans out individually ──
  const outerCount = 8;
  for (let i = 0; i < outerCount; i++) {
    const petalStart = 0.15 + i * 0.04;
    const petalEnd = petalStart + 0.42;
    const pp = easeOut(remap(progress, petalStart, petalEnd, 0, 1));
    if (pp <= 0) continue;
    const angle = (i / outerCount) * Math.PI * 2 - Math.PI / 2;
    drawPetal(ctx, cx, cy, angle, 125, 40, colors[i % colors.length], pp);
  }

  // ── Inner petals (0.38→0.82) ──
  const innerCount = 6;
  for (let i = 0; i < innerCount; i++) {
    const petalStart = 0.38 + i * 0.035;
    const petalEnd = petalStart + 0.38;
    const pp = easeOut(remap(progress, petalStart, petalEnd, 0, 1));
    if (pp <= 0) continue;
    const angle = (i / innerCount) * Math.PI * 2 + Math.PI / innerCount - Math.PI / 2;
    drawPetal(ctx, cx, cy, angle, 80, 28, colors[(i + 2) % colors.length], pp);
  }

  // ── Center (0.55→0.9) ──
  const cp = easeOut(remap(progress, 0.55, 0.9, 0, 1));
  if (cp > 0) {
    const r = 24 * cp;
    const rgb = hexToRgb(colors[0]);

    // Glow ring
    const glowG = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
    glowG.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.28)`);
    glowG.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 3, 0, Math.PI * 2);
    ctx.fillStyle = glowG;
    ctx.fill();

    // Circle
    const cg = ctx.createRadialGradient(cx - 5, cy - 5, 0, cx, cy, r);
    cg.addColorStop(0, 'rgba(255,228,110,0.97)');
    cg.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`);
    cg.addColorStop(1, `rgba(${Math.max(0,rgb.r-45)},${Math.max(0,rgb.g-45)},${Math.max(0,rgb.b-45)},1)`);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.fill();

    // Seed ring
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fill();
    }
  }

  // ── Pollen sparkles (0.82→1.0) ──
  const sp = remap(progress, 0.82, 1.0, 0, 1);
  if (sp > 0) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const dist = 38 + Math.sin(a * 4) * 9;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 2.8 * sp, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,218,70,${0.75 * sp})`;
      ctx.fill();
    }
  }
}

function drawPetal(ctx, cx, cy, angle, length, width, color, progress) {
  const rgb = hexToRgb(color);
  const L = length * progress;
  const W = width * Math.min(progress * 1.6, 1);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Main petal body
  const grad = ctx.createLinearGradient(0, 0, 0, -L);
  grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.96)`);
  grad.addColorStop(0.55, `rgba(${rgb.r},${rgb.g},${rgb.b},0.78)`);
  grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(W, -L * 0.28, W * 0.85, -L * 0.78, 0, -L);
  ctx.bezierCurveTo(-W * 0.85, -L * 0.78, -W, -L * 0.28, 0, 0);
  ctx.fillStyle = grad;
  ctx.fill();

  // Shine streak
  const shine = ctx.createLinearGradient(W * 0.1, -L * 0.1, W * 0.35, -L * 0.6);
  shine.addColorStop(0, 'rgba(255,255,255,0)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.18)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(W * 0.55, -L * 0.25, W * 0.35, -L * 0.75, 0, -L);
  ctx.bezierCurveTo(W * 0.08, -L * 0.55, W * 0.18, -L * 0.18, 0, 0);
  ctx.fillStyle = shine;
  ctx.fill();

  ctx.restore();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function easeOut(t) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); }
function remap(v, inMin, inMax, outMin, outMax) {
  return outMin + ((Math.min(Math.max(v, inMin), inMax) - inMin) / (inMax - inMin)) * (outMax - outMin);
}
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export default FlowerCanvas;