require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const {
  PixelbinConfig,
  PixelbinClient
} = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());

const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR
} = process.env;

// Affichage debug au démarrage
console.log("🔐 PIXELBIN_API_TOKEN:", PIXELBIN_API_TOKEN?.slice(0, 8));
console.log("☁️ PIXELBIN_CLOUD_NAME:", PIXELBIN_CLOUD_NAME);
console.log("📦 PIXELBIN_UPLOAD_DIR:", PIXELBIN_UPLOAD_DIR);
console.log("📍 PIXELBIN_ZONE_SLUG:", PIXELBIN_ZONE_SLUG);

// Initialisation SDK Pixelbin
const config = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug: PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

// Route POST /upload
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    const { buffer, originalname } = req.file;
    const basename = originalname
      .replace(/\s+/g, "_")
      .replace(/[\(\)]/g, "")
      .replace(/\.\w+$/, "");
    const uniqueName = `${basename}-${Date.now()}`;

    const upResult = await pixelbin.uploader.upload({
      file: buffer,
      name: uniqueName,
      path: PIXELBIN_UPLOAD_DIR,
      format: (originalname.match(/\.(\w+)$/) || [])[1] || "png",
      access: "public-read",
      overwrite: true,
    });

    const originalUrl = upResult.url;
    const transformSeg = `/sr.upscale(t:4x)/`;
    const transformedUrl = originalUrl.replace("/original/", transformSeg);

    return res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    return res.status(500).json({ error: "PixelBin", details: err.message });
  }
});

// Test route GET /
app.get("/", (req, res) => {
  res.send("✅ API Pixelbin opérationnelle !");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Pixelbin lancé sur le port ${PORT}`);
});
