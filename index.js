require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());
app.use(express.static("public"));

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
  try {
    const { buffer, originalname } = req.file;
    const basename = originalname.replace(/\s+/g, "_").replace(/\.\w+$/, "");
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
    const transformedUrl = originalUrl.replace("/original/", "/sr.upscale(t:4x)/");

    res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("Erreur Pixelbin :", err);
    res.status(500).json({ error: "Erreur Pixelbin", message: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API Pixelbin opérationnelle !");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
});
