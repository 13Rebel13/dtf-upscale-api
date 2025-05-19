require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());

// Récupération des variables d’environnement
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET
} = process.env;

console.log("🔑 Token:", PIXELBIN_API_TOKEN?.slice(0, 8));
console.log("☁️ CloudName:", PIXELBIN_CLOUD_NAME);
console.log("📁 UploadDir:", PIXELBIN_UPLOAD_DIR);
console.log("📦 Preset:", PIXELBIN_PRESET);
console.log("🏷 Zone:", PIXELBIN_ZONE_SLUG);

const config = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug: PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});

const pixelbin = new PixelbinClient(config);

// ROUTE DE TEST
app.get("/", (req, res) => {
  res.send("✅ API Pixelbin OK");
});

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    const { buffer, originalname } = req.file;
    const basename = originalname.replace(/\s+/g, "_").replace(/[\(\)]/g, "").replace(/\.\w+$/, "");
    const uniqueName = `${basename}_${Date.now()}`;

    const uploaded = await pixelbin.uploader.upload({
      file: buffer,
      name: uniqueName,
      path: PIXELBIN_UPLOAD_DIR,
      format: (originalname.match(/\.(\w+)$/) || [])[1] || "png",
      access: "public-read",
      overwrite: true,
      presetName: PIXELBIN_PRESET, // ✅ utilise le preset défini sur pixelbin.io
    });

    // l’URL avec transformation est retournée directement
    const { url: transformedUrl } = uploaded;

    if (!transformedUrl) {
      throw new Error("Lien transformé manquant");
    }

    return res.json({
      originalUrl: uploaded.originalUrl || null,
      transformedUrl
    });

  } catch (err) {
    console.error("❌ Erreur Pixelbin :", err);
    return res.status(500).json({ error: "Erreur Pixelbin", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API Pixelbin démarrée sur le port ${PORT}`);
});
