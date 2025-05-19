require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { PixelbinConfig, PixelbinClient, url } = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());

// ✅ Variables d’environnement
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET,
} = process.env;

// 🔐 Config SDK
const config = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug: PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

// ✅ Route API
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image reçue." });

  try {
    const { buffer, originalname } = req.file;
    const ext = originalname.split(".").pop();
    const baseName = originalname.replace(/\.\w+$/, "").replace(/\s+/g, "_");

    // 📤 Upload
    const uploaded = await pixelbin.uploader.upload({
      file: buffer,
      name: `${baseName}_${Date.now()}`,
      path: PIXELBIN_UPLOAD_DIR,
      format: ext,
      access: "public-read",
      overwrite: true,
    });

    const baseImageUrl = uploaded.url;

    // ✅ Générer l’URL avec le preset
    const transformedUrl = url({
      baseUrl: baseImageUrl,
      options: {
        presetName: PIXELBIN_PRESET, // ← "super_resolution"
      },
    });

    res.json({ originalUrl: baseImageUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur Pixelbin :", err);
    res.status(500).json({ error: "Erreur Pixelbin", message: err.message });
  }
});

// ✅ Ping route
app.get("/", (req, res) => {
  res.send("✅ API Pixelbin OK");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API Pixelbin démarrée sur le port ${PORT}`);
});
