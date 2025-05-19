// index.js complet avec frontend HTML + backend Node.js fonctionnel (avec bouton)

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());
app.use(express.static("public")); // sert le dossier /public

const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR
} = process.env;

// Configuration Pixelbin
const config = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug: PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

// Route POST /upload
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    const { buffer, originalname } = req.file;
    const base = originalname.replace(/\s+/g, "_").replace(/\W+/g, "").replace(/\.\w+$/, "");
    const unique = `${base}_${Date.now()}`;
    const format = (originalname.match(/\.(\w+)$/) || [])[1] || "png";

    const result = await pixelbin.uploader.upload({
      file: buffer,
      name: unique,
      path: PIXELBIN_UPLOAD_DIR,
      format,
      access: "public-read",
      overwrite: true,
    });

    const originalUrl = result.url;
    const transformedUrl = result.url.replace("/original/", "/sr.upscale(t:4x)/");

    res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("Erreur Pixelbin :", err);
    res.status(500).json({ error: "Lien transformé manquant", details: err.message });
  }
});

// Page test (fallback si accès direct racine)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "amelioration.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API Pixelbin démarrée sur le port ${PORT}`);
});
