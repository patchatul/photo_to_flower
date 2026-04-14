import { IncomingForm } from 'formidable';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Quantize image pixels to extract dominant colors
async function extractDominantColors(imagePath, colorCount = 5) {
  const { data, info } = await sharp(imagePath)
    .resize(100, 100, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = [];
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Skip very dark or very white pixels
    const brightness = (r + g + b) / 3;
    if (brightness > 20 && brightness < 240) {
      pixels.push([r, g, b]);
    }
  }

  // Simple median cut / bucket approach for dominant colors
  const buckets = {};
  for (const [r, g, b] of pixels) {
    const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }

  const sorted = Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, colorCount * 3);

  // De-duplicate similar colors
  const result = [];
  for (const [key] of sorted) {
    const [r, g, b] = key.split(',').map(Number);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    const isSimilar = result.some(existing => {
      const er = parseInt(existing.slice(1, 3), 16);
      const eg = parseInt(existing.slice(3, 5), 16);
      const eb = parseInt(existing.slice(5, 7), 16);
      return Math.abs(er - r) + Math.abs(eg - g) + Math.abs(eb - b) < 80;
    });
    if (!isSimilar) result.push(hex);
    if (result.length >= colorCount) break;
  }

  // Fill with defaults if not enough colors
  const defaults = ['#e8a87c', '#85c1e9', '#82e0aa', '#f1948a', '#bb8fce'];
  while (result.length < colorCount) result.push(defaults[result.length]);

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uploadDir = '/tmp';
  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Upload failed: ' + err.message });
    }

    const file = files.photo?.[0] || files.photo;
    if (!file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const filePath = file.filepath || file.path;

    try {
      const colors = await extractDominantColors(filePath, 5);

      // Clean up
      fs.unlink(filePath, () => {});

      res.status(200).json({ colors, count: colors.length });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Color extraction failed: ' + e.message });
    }
  });
}
