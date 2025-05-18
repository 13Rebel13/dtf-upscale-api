require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());
app.use(express.static("public")); // Sert les fichiers HTML de /public

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
  if (!req.file) return res.status(400).json({ error: "Aucune image reçue" });

  try {
    const { buffer, originalname } = req.file;
    const baseName = originalname.replace(/\.\w+$/, "").replace(/\s+/g, "_");
    const fileName = `${baseName}_${Date.now()}`;
    const extension = (originalname.match(/\.(\w+)$/) || [])[1] || "png";

    const uploaded = await pixelbin.uploader.upload({
      file: buffer,
      name: fileName,
      path: PIXELBIN_UPLOAD_DIR,
      format: extension,
      access: "public-read",
      overwrite: true,
    });

    const originalUrl = uploaded.url;
    const transformedUrl = originalUrl.replace("/original/", "/sr.upscale(t:4x)/");

    res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("Erreur:", err);
    res.status(500).json({ error: "Pixelbin Error", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API Pixelbin OK");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API en ligne sur le port ${PORT}`);
});
