import sharp from "sharp";

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "10mb",
  },
};

// Quantize image pixels to extract dominant colors
async function extractDominantColors(imagePath, colorCount = 5) {
  const { data, info } = await sharp(imagePath)
    .removeAlpha()
    .resize(100, 100, { fit: "cover" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = {};
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    if (brightness > 20 && brightness < 240) {
      const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
  }

  const sorted = Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, colorCount * 4);

  // De-duplicate similar colors
  const result = [];
  for (const [key] of sorted) {
    const [r, g, b] = key.split(",").map(Number);
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    const isSimilar = result.some((existing) => {
      const er = parseInt(existing.slice(1, 3), 16);
      const eg = parseInt(existing.slice(3, 5), 16);
      const eb = parseInt(existing.slice(5, 7), 16);
      return Math.abs(er - r) + Math.abs(eg - g) + Math.abs(eb - b) < 80;
    });
    if (!isSimilar) result.push(hex);
    if (result.length >= colorCount) break;
  }

  // Fill with defaults if not enough colors
  const defaults = ["#e8a87c", "#85c1e9", "#82e0aa", "#f1948a", "#bb8fce"];
  while (result.length < colorCount) result.push(defaults[result.length]);

  return result;
}
// Read raw request body into a Buffer (no disk writes)
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
// Extract image bytes from multipart body without writing to disk
function extractImageBuffer(rawBody, contentType) {
  const boundary = contentType.split("boundary=")[1]?.trim();
  if (!boundary) throw new Error("No boundary found in content-type header");

  const delimiter = Buffer.from(`\r\n--${boundary}`);
  const start = Buffer.from(`--${boundary}`);

  // Split on boundaries
  let pos = rawBody.indexOf(start);
  while (pos !== -1) {
    const next = rawBody.indexOf(delimiter, pos + start.length);
    const chunk =
      next === -1
        ? rawBody.slice(pos + start.length)
        : rawBody.slice(pos + start.length, next);

    const headerEnd = chunk.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headers = chunk.slice(0, headerEnd).toString("utf8");
      // Look for any part that has a filename (i.e. is a file, not a text field)
      if (headers.includes("filename=")) {
        const body = chunk.slice(headerEnd + 4);
        // Strip trailing \r\n if present
        const imageData =
          body[body.length - 2] === 0x0d && body[body.length - 1] === 0x0a
            ? body.slice(0, -2)
            : body;
        if (imageData.length > 0) return imageData;
      }
    }
    pos =
      next === -1
        ? -1
        : rawBody.indexOf(delimiter, next) === next
          ? next + delimiter.length
          : next;
    if (next === -1) break;
    pos = next;
  }

  throw new Error("No image data found in request");
}
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res
        .status(400)
        .json({ error: "Expected multipart/form-data upload" });
    }

    const rawBody = await readBody(req);
    const imageBuffer = extractImageBuffer(rawBody, contentType);
    const colors = await extractDominantColors(imageBuffer, 5);

    res.status(200).json({ colors, count: colors.length });
  } catch (e) {
    console.error("extract-colors error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
