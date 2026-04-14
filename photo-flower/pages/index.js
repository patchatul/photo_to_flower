import { useState, useRef, useCallback } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import styles from "../styles/Home.module.css";

const FlowerCanvas = dynamic(() => import("../components/FlowerCanvas"), {
  ssr: false,
});

export default function Home() {
  const [colors, setColors] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
 const [animationKey, setAnimationKey] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flowerReady, setFlowerReady] = useState(false);

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }
    setError(null);
    setFlowerReady(false);

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/extract-colors", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error((await res.json()).error || "Server error");

      const data = await res.json();
      setColors(data.colors);
      setAnimationKey(k => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const handleReset = () => {
    setColors(null);
    setPreview(null);
    setFlowerReady(false);
    setAnimationKey(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <Head>
        <title>Photo to Flower Generator</title>
        <meta
          name="description"
          content="Transform any photo into a unique generative flower using its dominant colors."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Henny+Penny&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className={styles.page}>
        {/* Ambient background orbs */}
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.orb3} />

        <header className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoFlower}>✿</span>
            <span className={styles.logoText}>Photo to Flower Generator</span>
            <span className={styles.logoFlower}>✿</span>
          </div>
        </header>

        <main className={styles.main}>
          {!colors ? (
            <div className={styles.uploadSection}>
              <div
                className={`${styles.dropzone} ${isDragging ? styles.dragging : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />

                {preview ? (
                  <div className={styles.previewContainer}>
                    <img
                      src={preview}
                      alt="Preview"
                      className={styles.previewImg}
                    />
                    {loading && (
                      <div className={styles.loadingOverlay}>
                        <div className={styles.spinner} />
                        <p>extracting colors…</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.dropzoneContent}>
                    <div className={styles.uploadIcon}>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 48 48"
                        fill="none"
                      >
                        <circle
                          cx="24"
                          cy="24"
                          r="23"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                        <path
                          d="M24 32V20M24 20L18 26M24 20L30 26"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M16 34h16"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          opacity="0.4"
                        />
                      </svg>
                    </div>
                    <p className={styles.dropText}>drop a photo here</p>
                    <p className={styles.dropSubText}>
                      or click to browse an image
                    </p>
                  </div>
                )}
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.howItWorks}>
                <div className={styles.step}>
                  <span className={styles.stepNum}>01</span>
                  <span>upload your photo</span>
                </div>
                <div className={styles.stepArrow}>→</div>
                <div className={styles.step}>
                  <span className={styles.stepNum}>02</span>
                  <span>colors are extracted</span>
                </div>
                <div className={styles.stepArrow}>→</div>
                <div className={styles.step}>
                  <span className={styles.stepNum}>03</span>
                  <span>your flower blooms</span>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.resultSection}>
              <div className={styles.resultLeft}>
                <div className={styles.photoCard}>
                  <img
                    src={preview}
                    alt="Source"
                    className={styles.sourceImg}
                  />
                  <div className={styles.photoLabel}>source photo</div>
                </div>

                <div className={styles.paletteSection}>
                  <p className={styles.paletteLabel}>extracted palette</p>
                  <div className={styles.palette}>
                    {colors.map((color, i) => (
                      <div key={i} className={styles.swatchWrapper}>
                        <div
                          className={styles.swatch}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                        <span className={styles.swatchHex}>{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.actions}>
                  <button className={styles.btnSecondary} onClick={handleReset}>
                    try another photo
                  </button>
                </div>
              </div>

              <div className={styles.canvasWrapper}>
                <div
                  className={styles.canvasGlow}
                  style={{
                    background: colors[0],
                    opacity: 0.15,
                  }}
                />
                <FlowerCanvas
                  ref={canvasRef}
                  colors={colors}
                  animationKey={animationKey}
                  onAnimationComplete={() => {
                    setFlowerReady(true);
                  }}
                />
                {flowerReady && (
                  <p className={styles.bloomText}>✿ your flower has bloomed ✿</p>
                )}
              </div>
            </div>
          )}
        </main>
        <footer className={styles.footer}>
          <p>made by Pat with love for flowers</p>
        </footer>
      </div>
    </>
  );
}
