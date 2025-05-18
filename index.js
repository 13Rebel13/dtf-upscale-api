require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

// Variables d’environnement
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR
} = process.env;

// 🔐 Config SDK
const config   = new PixelbinConfig({
  domain:    "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug:  PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

// 🚀 Upload + upscale
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    const { buffer, originalname } = req.file;

    const basename = originalname
      .replace(/\s+/g, "_")
      .replace(/[\(\)]/g, "")
      .replace(/\.\w+$/, "");

    const suffix = Math.random().toString(36).substring(2, 6);
    const uniqueName = `${basename}-${suffix}`;
    const format = (originalname.match(/\.(\w+)$/) || [])[1] || "png";

    console.log("🖼️ Uploading image:", uniqueName);

    const upResult = await pixelbin.uploader.upload({
      file: buffer,
      name: uniqueName,
      path: PIXELBIN_UPLOAD_DIR,
      format,
      access: "public-read",
      overwrite: true,
    });

    console.log("✅ Upload réussi:", upResult.url);

    const originalUrl = upResult.url;

    if (!originalUrl.includes("/original/")) {
      return res.status(500).json({ error: "URL invalide retournée" });
    }

    const transformedUrl = originalUrl.replace("/original/", "/sr.upscale(t:4x)/");

    res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur Pixelbin :", err.message);
    res.status(500).json({ error: "PixelBin", details: err.message });
  }
});

// ✅ Ping serveur
app.get("/", (req, res) => {
  res.send("API Pixelbin OK ✅");
});

// 🔊 Lancement
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API démarrée sur le port ${PORT}`);
});
