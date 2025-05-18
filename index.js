require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());

// Variables d’environnement
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR
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
    const basename = originalname.replace(/\s+/g, "_").replace(/[\(\)]/g, "").replace(/\.\w+$/, "");
    const uniqueName = `${basename}-${Date.now()}`;
    const format = (originalname.match(/\.(\w+)$/) || [])[1] || "png";

    const result = await pixelbin.uploader.upload({
      file: buffer,
      name: uniqueName,
      path: PIXELBIN_UPLOAD_DIR,
      format,
      access: "public-read",
      overwrite: true,
    });

    // Construction manuelle de l’URL transformée
    const urlParts = result.url.split("/original/");
    const transformedUrl = urlParts[0] + "/sr.upscale(t:4x)/" + urlParts[1];

    return res.json({ originalUrl: result.url, transformedUrl });
  } catch (err) {
    console.error("Erreur Pixelbin :", err);
    return res.status(500).json({ error: "Erreur Pixelbin", details: err.message });
  }
});

// Affiche OK si on visite la racine
app.get("/", (req, res) => {
  res.send("✅ API Pixelbin OK");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API démarrée sur le port ${PORT}`);
});
