// index.js (Backend Node.js avec Pixelbin + preset)
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app = express();
const upload = multer();

app.use(cors());
app.use(express.static("public"));

const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET_NAME
} = process.env;

console.log("🔑 Token:", PIXELBIN_API_TOKEN?.slice(0, 8));
console.log("☁️ CloudName:", PIXELBIN_CLOUD_NAME);
console.log("🏷 ZoneSlug:", PIXELBIN_ZONE_SLUG);
console.log("📁 UploadDir:", PIXELBIN_UPLOAD_DIR);
console.log("🧩 Preset:", PIXELBIN_PRESET_NAME);

const config = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug: PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    const { buffer, originalname } = req.file;
    const ext = (originalname.match(/\.(\w+)$/) || [])[1] || "png";
    const base = originalname.replace(/\s+/g, "_").replace(/[()]/g, "").replace(/\.\w+$/, "");
    const uniqueName = `${base}_${Date.now()}`;

    const uploaded = await pixelbin.uploader.upload({
      file: buffer,
      name: uniqueName,
      path: PIXELBIN_UPLOAD_DIR,
      format: ext,
      access: "public-read",
      overwrite: true,
    });

    const baseUrl = uploaded.url.split("/original/")[0];
    const transformedUrl = `${baseUrl}/${PIXELBIN_PRESET_NAME}/${PIXELBIN_UPLOAD_DIR}/${uniqueName}.${ext}`;

    res.json({ transformedUrl });
  } catch (err) {
    console.error("❌ Erreur Pixelbin:", err);
    res.status(500).json({ error: "Erreur Pixelbin", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API Pixelbin OK");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API Pixelbin démarrée sur le port ${PORT}`);
});
