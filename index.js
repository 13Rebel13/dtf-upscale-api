require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const {
  PixelbinConfig,
  PixelbinClient,
  url: PixelbinUrl,
} = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());

const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET,
} = process.env;

const config = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug: PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image reçue." });

  try {
    const { buffer, originalname } = req.file;
    const baseName = originalname.replace(/\.\w+$/, "");
    const uniqueName = `${baseName}_${Date.now()}`;
    const format = (originalname.match(/\.(\w+)$/) || [])[1] || "png";

    const uploaded = await pixelbin.uploader.upload({
      file: buffer,
      name: uniqueName,
      path: PIXELBIN_UPLOAD_DIR,
      format,
      access: "public-read",
      overwrite: true,
    });

    // ✅ Utilise ton preset plutôt que le plugin "sr"
    const transformedUrl = PixelbinUrl.buildUrl({
      cloudName: PIXELBIN_CLOUD_NAME,
      zone: PIXELBIN_ZONE_SLUG,
      version: uploaded.version,
      path: uploaded.path,
      transformations: [
        {
          preset: PIXELBIN_PRESET,
        },
      ],
    });

    res.json({
      originalUrl: uploaded.url,
      transformedUrl,
    });
  } catch (err) {
    console.error("❌ Erreur Pixelbin :", err);
    res.status(500).json({ error: "Erreur Pixelbin", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API Pixelbin OK");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API démarrée sur le port ${PORT}`);
});
