# 🌸 Photo to Flower Generator

Transform any photograph into a unique generative flower using its dominant colors.

## ✨ Features

- **Color Extraction** — Extracts 5 dominant colors from any uploaded image using pixel analysis with Sharp
- **Generative Flower** — Draws a layered, animated flower on HTML Canvas using the extracted palette
- **Bloom Animation** — Petals unfold with an eased cubic animation (1.8s)
- **Download** — Save your flower as a PNG

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 |
| Backend | Next.js API Routes (Node.js) |
| Image Processing | Sharp (color extraction) |
| File Upload | Formidable |
| Drawing | HTML5 Canvas API |
| Fonts | Cormorant Garamond + DM Sans |
| Deploy | Vercel |

## 🚀 Deploy to Vercel (5 minutes)

### Option A — Vercel CLI

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Clone / enter project
cd photo-flower

# 3. Install dependencies
npm install

# 4. Deploy
vercel


## 🖥 Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## 📁 Project Structure

```
photo-flower/
├── pages/
│   ├── _app.js          # Global styles
│   ├── index.js         # Main UI page
│   └── api/
│       └── extract-colors.js  # Color extraction endpoint
├── components/
│   └── FlowerCanvas.js  # Canvas flower drawing + animation
├── styles/
│   ├── globals.css
│   └── Home.module.css  # All page styles
├── package.json
├── next.config.js
└── vercel.json
```

## 🎨 How It Works

1. User drops/uploads a photo
2. `POST /api/extract-colors` — Sharp resizes image to 100×100, samples every pixel, buckets RGB values, and returns the top 5 distinct dominant colors as hex codes
3. `FlowerCanvas.js` receives the palette and draws:
   - **Stem + leaf** using bezier curves
   - **8 outer petals** (larger, from colors[0–4])
   - **6 inner petals** (smaller, offset 30°, from colors[2–4])
   - **Center** with radial gradient and seed dots
   - **Pollen sparkles** that appear after bloom
4. Petals animate open with `ease-out-cubic` over 1.8s
5. User can download the canvas as a PNG

## 📝 Notes

- Max upload size: 10MB
- All uploads are processed in `/tmp` and deleted immediately — nothing is stored
- No database, no auth, no env variables needed
