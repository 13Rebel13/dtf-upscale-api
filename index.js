require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const {
  PixelbinConfig,
  PixelbinClient,
  url: PixelbinUrl
} = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());
app.use(express.static("public")); // Sert les fichiers HTML

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
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image reçue." });
  }

  try {
    const { buffer, originalname } = req.file;
    const basename = originalname
      .replace(/\s+/g, "_")
      .replace(/[\(\)]/g, "")
      .replace(/\.\w+$/, "");
    const uniqueName = `${basename}-${Date.now()}`;
    const extension = (originalname.match(/\.(\w+)$/) || [])[1] || "png";

    // Upload de l’image originale
    const uploadResult = await pixelbin.uploader.upload({
      file: buffer,
      name: uniqueName,
      path: PIXELBIN_UPLOAD_DIR,
      format: extension,
      access: "public-read",
      overwrite: true,
    });

    const { filePath } = uploadResult;

    // 🧠 Construction propre de l'URL avec preset
    const transformedUrl = PixelbinUrl({
      cloudName: PIXELBIN_CLOUD_NAME,
      zone: PIXELBIN_ZONE_SLUG,
      version: "v1",
      path: filePath,
      transformation: [
        {
          preset: PIXELBIN_PRESET
        }
      ]
    });

    res.json({
      originalUrl: uploadResult.url,
      transformedUrl,
    });
  } catch (err) {
    console.error("❌ Erreur Pixelbin :", err);
    res.status(500).json({ error: "Erreur Pixelbin", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API Pixelbin démarrée sur le port ${PORT}`);
});
