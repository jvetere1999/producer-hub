import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const svgPath = path.join(root, 'static', 'icons', 'icon.svg');

if (!fs.existsSync(svgPath)) {
  console.error(`Missing ${svgPath}. Create it first (static/icons/icon.svg).`);
  process.exit(1);
}

const svg = fs.readFileSync(svgPath);

async function writePng(size, filename) {
  const outPath = path.join(root, 'static', 'icons', filename);
  await sharp(svg, { density: 256 })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`Wrote ${outPath}`);
}

await writePng(192, 'icon-192.png');
await writePng(512, 'icon-512.png');
await writePng(512, 'icon-512-maskable.png');

// Ensure a favicon exists (use the same svg)
const faviconPath = path.join(root, 'static', 'favicon.svg');
if (!fs.existsSync(faviconPath)) {
  fs.copyFileSync(svgPath, faviconPath);
  console.log(`Wrote ${faviconPath}`);
}
