import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

const FlowerCanvas = forwardRef(function FlowerCanvas({ colors, isAnimating, onAnimationComplete }, ref) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const progressRef = useRef(0);

  useImperativeHandle(ref, () => ({
    downloadFlower() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = 'my-flower.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }));

  useEffect(() => {
    if (!colors || colors.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    // Cancel any ongoing animation
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    progressRef.current = 0;

    function hexToRgb(hex) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }

    function drawBackground(ctx, W, H, colors) {
      const grad = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.8);
      const c1 = hexToRgb(colors[0]);
      const c2 = hexToRgb(colors[colors.length - 1]);
      grad.addColorStop(0, `rgba(${c1.r},${c1.g},${c1.b},0.12)`);
      grad.addColorStop(1, `rgba(${c2.r},${c2.g},${c2.b},0.06)`);
      ctx.fillStyle = '#0d0d0f';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Noise dots
      ctx.save();
      for (let i = 0; i < 180; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = Math.random() * 1.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
        ctx.fill();
      }
      ctx.restore();
    }

    function drawPetal(ctx, cx, cy, angle, length, width, color, progress, layerIndex) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      const petalLength = length * progress;
      const petalWidth = width * Math.min(progress * 1.5, 1);

      const rgb = hexToRgb(color);

      // Petal gradient
      const grad = ctx.createLinearGradient(0, 0, 0, -petalLength);
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.95)`);
      grad.addColorStop(0.6, `rgba(${rgb.r},${rgb.g},${rgb.b},0.75)`);
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        petalWidth, -petalLength * 0.3,
        petalWidth * 0.8, -petalLength * 0.8,
        0, -petalLength
      );
      ctx.bezierCurveTo(
        -petalWidth * 0.8, -petalLength * 0.8,
        -petalWidth, -petalLength * 0.3,
        0, 0
      );
      ctx.fillStyle = grad;
      ctx.fill();

      // Petal shine
      const shineGrad = ctx.createLinearGradient(0, 0, petalWidth * 0.3, -petalLength * 0.5);
      shineGrad.addColorStop(0, `rgba(255,255,255,0)`);
      shineGrad.addColorStop(0.5, `rgba(255,255,255,0.15)`);
      shineGrad.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        petalWidth * 0.5, -petalLength * 0.3,
        petalWidth * 0.3, -petalLength * 0.8,
        0, -petalLength
      );
      ctx.bezierCurveTo(
        petalWidth * 0.1, -petalLength * 0.6,
        petalWidth * 0.2, -petalLength * 0.2,
        0, 0
      );
      ctx.fillStyle = shineGrad;
      ctx.fill();

      ctx.restore();
    }

    function drawStem(ctx, cx, cy, H, progress) {
      const stemEnd = cy + (H - cy) * 0.45;
      const stemProgress = Math.min(progress * 2, 1);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy + 18);
      ctx.bezierCurveTo(
        cx + 15, cy + (stemEnd - cy) * 0.4,
        cx - 10, cy + (stemEnd - cy) * 0.7,
        cx, cy + (stemEnd - cy) * stemProgress
      );
      const stemGrad = ctx.createLinearGradient(cx, cy, cx, stemEnd);
      stemGrad.addColorStop(0, '#4a7c59');
      stemGrad.addColorStop(1, '#2d5a3d');
      ctx.strokeStyle = stemGrad;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Leaf
      if (stemProgress > 0.5) {
        const leafProg = (stemProgress - 0.5) * 2;
        const leafY = cy + (stemEnd - cy) * 0.5;
        ctx.beginPath();
        ctx.moveTo(cx + 2, leafY);
        ctx.bezierCurveTo(
          cx + 35 * leafProg, leafY - 18 * leafProg,
          cx + 40 * leafProg, leafY + 5,
          cx + 2, leafY + 10
        );
        ctx.fillStyle = '#3d7a4f';
        ctx.fill();
      }
      ctx.restore();
    }

    function drawCenter(ctx, cx, cy, colors, progress) {
      const r = 22 * progress;
      const innerColor = colors[0];
      const rgb = hexToRgb(innerColor);

      // Outer glow
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.5);
      glowGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`);
      glowGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Main center circle
      const centerGrad = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, r);
      centerGrad.addColorStop(0, `rgba(255,220,100,0.95)`);
      centerGrad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`);
      centerGrad.addColorStop(1, `rgba(${Math.max(0,rgb.r-40)},${Math.max(0,rgb.g-40)},${Math.max(0,rgb.b-40)},1)`);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = centerGrad;
      ctx.fill();

      // Seed dots
      const dotCount = 12;
      for (let i = 0; i < dotCount; i++) {
        const a = (i / dotCount) * Math.PI * 2;
        const dr = r * 0.55;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * dr, cy + Math.sin(a) * dr, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,0.6)`;
        ctx.fill();
      }
    }

    function drawFlower(progress) {
      ctx.clearRect(0, 0, W, H);
      drawBackground(ctx, W, H, colors);

      const stemProgress = Math.min(progress * 1.5, 1);
      drawStem(ctx, cx, cy, H, stemProgress);

      // Outer layer petals (bigger)
      const outerPetalCount = 8;
      const outerLength = 120;
      const outerWidth = 38;
      const outerDelay = 0.0;
      const outerProg = Math.max(0, Math.min((progress - outerDelay) / 0.6, 1));

      for (let i = 0; i < outerPetalCount; i++) {
        const angle = (i / outerPetalCount) * Math.PI * 2 - Math.PI / 2;
        const colorIdx = i % colors.length;
        const petalProg = Math.max(0, Math.min((outerProg - i * 0.02), 1));
        drawPetal(ctx, cx, cy, angle, outerLength, outerWidth, colors[colorIdx], petalProg, 0);
      }

      // Inner layer petals (smaller, offset)
      const innerPetalCount = 6;
      const innerLength = 80;
      const innerWidth = 28;
      const innerDelay = 0.25;
      const innerProg = Math.max(0, Math.min((progress - innerDelay) / 0.55, 1));

      for (let i = 0; i < innerPetalCount; i++) {
        const angle = (i / innerPetalCount) * Math.PI * 2 + Math.PI / innerPetalCount - Math.PI / 2;
        const colorIdx = (i + 2) % colors.length;
        const petalProg = Math.max(0, Math.min((innerProg - i * 0.02), 1));
        drawPetal(ctx, cx, cy, angle, innerLength, innerWidth, colors[colorIdx], petalProg, 1);
      }

      const centerDelay = 0.45;
      const centerProg = Math.max(0, Math.min((progress - centerDelay) / 0.4, 1));
      drawCenter(ctx, cx, cy, colors, centerProg);

      // Pollen sparkles near center
      if (progress > 0.7) {
        const sparkleProg = (progress - 0.7) / 0.3;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const dist = 35 + Math.sin(a * 3) * 8;
          const x = cx + Math.cos(a) * dist;
          const y = cy + Math.sin(a) * dist;
          ctx.beginPath();
          ctx.arc(x, y, 2.5 * sparkleProg, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 220, 80, ${0.7 * sparkleProg})`;
          ctx.fill();
        }
      }
    }

    if (isAnimating) {
      const duration = 1800; // ms
      const start = performance.now();

      function animate(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        progressRef.current = eased;
        drawFlower(eased);

        if (t < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          onAnimationComplete?.();
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    } else {
      drawFlower(1);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [colors, isAnimating]);

  return (
    <canvas
      ref={canvasRef}
      width={520}
      height={520}
      style={{
        borderRadius: '20px',
        display: 'block',
        maxWidth: '100%',
        height: 'auto',
      }}
    />
  );
});

export default FlowerCanvas;
