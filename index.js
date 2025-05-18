require("dotenv").config();
const express  = require("express");
const multer   = require("multer");
const cors     = require("cors");
const { PixelbinConfig, PixelbinClient, url: PixelbinUrl } = require("@pixelbin/admin");

const app    = express();
const upload = multer();
app.use(cors());

const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR
} = process.env;

const config   = new PixelbinConfig({
  domain:    "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug:  PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    const { buffer, originalname } = req.file;
    const basename = originalname.replace(/\s+/g, "_").replace(/[\(\)]/g, "").replace(/\.\w+$/, "");
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

    // ✅ Génération propre de l’URL transformée
    const transformedUrl = PixelbinUrl.URLBuilder.getUrl({
      cloudName: PIXELBIN_CLOUD_NAME,
      zone: PIXELBIN_ZONE_SLUG,
      version: "v1",
      path: upResult.path, // ← chemin relatif
      transformations: ["sr.upscale(t:4x)"]
    });

    res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur PixelBin :", err);
    res.status(500).json({ error: "PixelBin", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API Pixelbin OK");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy PixelBin démarré sur le port ${PORT}`);
});
