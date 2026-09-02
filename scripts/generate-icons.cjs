/**
 * Sakku App Icon Generator
 * Generates 192x192 and 512x512 PNG icons from code.
 * 
 * Color Palette (from official logo):
 *   Coral:  #FF8A70
 *   Teal:   #5CC4BE
 *   Mint:   #BDE8E1
 *   Dark:   #1F2D2F
 * 
 * Run: node scripts/generate-icons.cjs
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size, variant = 'light') {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512; // scale factor

  const isDark = variant === 'dark';
  const bgColor = isDark ? '#1F2D2F' : '#FAF8F5';

  // ─── Background: rounded square ───
  const bgRadius = 100 * s;
  ctx.beginPath();
  roundRect(ctx, 0, 0, size, size, bgRadius);
  ctx.fillStyle = bgColor;
  ctx.fill();

  // ─── Soft shadow beneath pocket ───
  ctx.save();
  ctx.shadowColor = isDark ? 'rgba(255, 138, 112, 0.15)' : 'rgba(255, 138, 112, 0.2)';
  ctx.shadowBlur = 30 * s;
  ctx.shadowOffsetY = 10 * s;
  ctx.beginPath();
  ctx.ellipse(256 * s, 380 * s, 140 * s, 30 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? 'rgba(255, 138, 112, 0.06)' : 'rgba(255, 138, 112, 0.08)';
  ctx.fill();
  ctx.restore();

  // ─── Pocket body (coral) ───
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(120 * s, 220 * s);
  ctx.bezierCurveTo(100 * s, 260 * s, 95 * s, 340 * s, 130 * s, 380 * s);
  ctx.bezierCurveTo(160 * s, 410 * s, 350 * s, 410 * s, 380 * s, 380 * s);
  ctx.bezierCurveTo(415 * s, 340 * s, 410 * s, 260 * s, 390 * s, 220 * s);
  ctx.closePath();

  // Gradient fill for pocket — using #FF8A70 base
  const pocketGrad = ctx.createLinearGradient(100 * s, 200 * s, 400 * s, 400 * s);
  pocketGrad.addColorStop(0, '#FFB09A');
  pocketGrad.addColorStop(0.3, '#FF8A70');
  pocketGrad.addColorStop(0.7, '#E87A60');
  pocketGrad.addColorStop(1, '#CC6A50');
  ctx.fillStyle = pocketGrad;
  ctx.fill();

  // Pocket inner shadow/depth
  ctx.beginPath();
  ctx.moveTo(130 * s, 230 * s);
  ctx.bezierCurveTo(140 * s, 210 * s, 370 * s, 210 * s, 380 * s, 230 * s);
  ctx.lineTo(370 * s, 240 * s);
  ctx.bezierCurveTo(360 * s, 225 * s, 150 * s, 225 * s, 140 * s, 240 * s);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.fill();
  ctx.restore();

  // ─── Pocket opening / fold at top ───
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(115 * s, 220 * s);
  ctx.bezierCurveTo(130 * s, 190 * s, 380 * s, 190 * s, 395 * s, 220 * s);
  ctx.bezierCurveTo(380 * s, 210 * s, 130 * s, 210 * s, 115 * s, 220 * s);
  ctx.closePath();

  const foldGrad = ctx.createLinearGradient(115 * s, 190 * s, 395 * s, 220 * s);
  foldGrad.addColorStop(0, '#FFBCA8');
  foldGrad.addColorStop(0.5, '#FFB09A');
  foldGrad.addColorStop(1, '#FF9E87');
  ctx.fillStyle = foldGrad;
  ctx.fill();
  ctx.restore();

  // ─── Pocket highlight (left side) ───
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(135 * s, 240 * s);
  ctx.bezierCurveTo(115 * s, 280 * s, 115 * s, 350 * s, 145 * s, 380 * s);
  ctx.bezierCurveTo(125 * s, 350 * s, 125 * s, 280 * s, 145 * s, 245 * s);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fill();
  ctx.restore();

  // ─── Sphere (teal/mint) — using #5CC4BE ───
  ctx.save();
  const sphereX = 256 * s;
  const sphereY = 300 * s;
  const sphereR = 72 * s;

  // Sphere base gradient
  const sphereGrad = ctx.createRadialGradient(
    sphereX - 15 * s, sphereY - 15 * s, 5 * s,
    sphereX, sphereY, sphereR
  );
  sphereGrad.addColorStop(0, '#C8EDE9');
  sphereGrad.addColorStop(0.3, '#8DDDDA');
  sphereGrad.addColorStop(0.7, '#5CC4BE');
  sphereGrad.addColorStop(1, '#48B0AA');
  ctx.beginPath();
  ctx.arc(sphereX, sphereY, sphereR, 0, Math.PI * 2);
  ctx.fillStyle = sphereGrad;
  ctx.fill();

  // Sphere rim light
  ctx.beginPath();
  ctx.arc(sphereX, sphereY, sphereR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2 * s;
  ctx.stroke();

  // Top highlight (glossy)
  ctx.beginPath();
  ctx.ellipse(sphereX - 10 * s, sphereY - 25 * s, 30 * s, 18 * s, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fill();

  // Small sparkle star
  drawSparkle(ctx, sphereX + 20 * s, sphereY - 30 * s, 8 * s, 'rgba(255, 255, 255, 0.9)');

  // Bottom reflection
  ctx.beginPath();
  ctx.ellipse(sphereX + 5 * s, sphereY + 30 * s, 20 * s, 8 * s, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fill();

  ctx.restore();

  return canvas;
}

function drawSparkle(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.15, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.15, y);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x, y + size * 0.15);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y - size * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Generate icons ───
const publicDir = path.join(__dirname, '..', 'public');

// Light mode icons (default)
[192, 512].forEach(size => {
  const canvas = drawIcon(size, 'light');
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(publicDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Generated: icon-${size}.png (${buffer.length} bytes)`);
});

// Favicon
const faviconCanvas = drawIcon(32, 'light');
const faviconBuffer = faviconCanvas.toBuffer('image/png');
fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconBuffer);
console.log(`✅ Generated: favicon.png (${faviconBuffer.length} bytes)`);

// Dark mode icons
[192, 512].forEach(size => {
  const canvas = drawIcon(size, 'dark');
  const buffer = canvas.toBuffer('image/png');
  const filePath = path.join(publicDir, `icon-${size}-dark.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Generated: icon-${size}-dark.png (${buffer.length} bytes)`);
});

console.log('\nDone! Icons saved to public/');
