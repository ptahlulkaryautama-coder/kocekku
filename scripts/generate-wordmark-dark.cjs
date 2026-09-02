/**
 * Sakku Wordmark Dark Mode Generator
 *
 * Creates sakku_wordmark-dark.png from sakku_wordmark.png by shifting
 * the coral and teal colors to the lighter values specified in
 * SAKKU_BRAND_GUIDELINES.md for dark backgrounds.
 *
 * Light mode colors (from sampled wordmark):
 *   Coral: ~(252-255, 127-140, 94-109)  →  Dark: rgb(240, 138, 98) = #F08A62
 *   Teal:  ~(121-131, 192-198, 184-191) →  Dark: rgb(109, 212, 212) = #6DD4D4
 *
 * Run: node scripts/generate-wordmark-dark.cjs
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Color classification thresholds (HSL-based)
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function classifyPixel(r, g, b, a) {
  if (a === 0) return 'transparent';

  const [h, s, l] = rgbToHsl(r, g, b);

  // Coral family: hue ~10-25°, moderate-high saturation
  if (h >= 0 && h <= 30 && s >= 40 && l >= 40) return 'coral';
  // Teal family: hue ~160-195°, moderate-high saturation
  if (h >= 155 && h <= 200 && s >= 20 && l >= 40) return 'teal';

  return 'other';
}

// Target colors for dark mode (from brand guidelines)
const DARK_CORAL = { r: 240, g: 138, b: 98 };   // #F08A62
const DARK_TEAL  = { r: 109, g: 212, b: 212 };  // #6DD4D4

async function generate() {
  const srcPath = path.join(__dirname, '..', 'public', 'sakku_wordmark.png');
  const dstPath = path.join(__dirname, '..', 'public', 'sakku_wordmark-dark.png');

  const img = await loadImage(srcPath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  // First pass: collect representative light-mode colors for each family
  let coralSum = { r: 0, g: 0, b: 0, count: 0 };
  let tealSum  = { r: 0, g: 0, b: 0, count: 0 };

  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i+1], data[i+2], data[i+3]];
    const cls = classifyPixel(r, g, b, a);
    if (cls === 'coral') {
      coralSum.r += r; coralSum.g += g; coralSum.b += b; coralSum.count++;
    } else if (cls === 'teal') {
      tealSum.r += r; tealSum.g += g; tealSum.b += b; tealSum.count++;
    }
  }

  // Average light-mode colors
  const avgCoral = coralSum.count > 0 ? {
    r: coralSum.r / coralSum.count,
    g: coralSum.g / coralSum.count,
    b: coralSum.b / coralSum.count,
  } : { r: 252, g: 135, b: 103 };

  const avgTeal = tealSum.count > 0 ? {
    r: tealSum.r / tealSum.count,
    g: tealSum.g / tealSum.count,
    b: tealSum.b / tealSum.count,
  } : { r: 126, g: 196, b: 188 };

  console.log(`Light coral avg: rgb(${Math.round(avgCoral.r)}, ${Math.round(avgCoral.g)}, ${Math.round(avgCoral.b)}) [${coralSum.count} px]`);
  console.log(`Light teal avg:  rgb(${Math.round(avgTeal.r)}, ${Math.round(avgTeal.g)}, ${Math.round(avgTeal.b)}) [${tealSum.count} px]`);
  console.log(`Dark coral target: rgb(${DARK_CORAL.r}, ${DARK_CORAL.g}, ${DARK_CORAL.b})`);
  console.log(`Dark teal target:  rgb(${DARK_TEAL.r}, ${DARK_TEAL.g}, ${DARK_TEAL.b})`);

  // Compute per-channel scale factors from average light to target dark
  const coralScale = {
    r: DARK_CORAL.r / avgCoral.r,
    g: DARK_CORAL.g / avgCoral.g,
    b: DARK_CORAL.b / avgCoral.b,
  };
  const tealScale = {
    r: DARK_TEAL.r / avgTeal.r,
    g: DARK_TEAL.g / avgTeal.g,
    b: DARK_TEAL.b / avgTeal.b,
  };

  // Second pass: shift each pixel
  let coralChanged = 0, tealChanged = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i+1], data[i+2], data[i+3]];
    const cls = classifyPixel(r, g, b, a);

    if (cls === 'coral') {
      data[i]   = Math.min(255, Math.round(r * coralScale.r));
      data[i+1] = Math.min(255, Math.round(g * coralScale.g));
      data[i+2] = Math.min(255, Math.round(b * coralScale.b));
      coralChanged++;
    } else if (cls === 'teal') {
      data[i]   = Math.min(255, Math.round(r * tealScale.r));
      data[i+1] = Math.min(255, Math.round(g * tealScale.g));
      data[i+2] = Math.min(255, Math.round(b * tealScale.b));
      tealChanged++;
    }
    // 'transparent' and 'other' pixels are left untouched
  }

  ctx.putImageData(imageData, 0, 0);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(dstPath, buffer);

  console.log(`\n✅ Generated: sakku_wordmark-dark.png (${img.width}x${img.height}, ${buffer.length} bytes)`);
  console.log(`   Coral pixels shifted: ${coralChanged}`);
  console.log(`   Teal pixels shifted: ${tealChanged}`);
}

generate().catch(err => { console.error(err); process.exit(1); });
