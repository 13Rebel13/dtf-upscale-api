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
  PIXELBIN_PRESET
} = process.env;

const config = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug: PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

// 🔁 Route principale = page HTML avec boutons
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "amelioration.html"));
});

// 🔁 Route API POST /upload
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Aucune image envoyée." });

  try {
    const { buffer, originalname } = req.file;
    const base = originalname.replace(/\s+/g, "_").replace(/[\(\)]/g, "").replace(/\.\w+$/, "");
    const filename = `${base}_${Date.now()}`;

    const result = await pixelbin.uploader.upload({
      file: buffer,
      name: filename,
      path: PIXELBIN_UPLOAD_DIR,
      format: (originalname.match(/\.(\w+)$/) || [])[1] || "png",
      access: "public-read",
      overwrite: true,
    });

    const originalUrl = result.url;

    // Appliquer le preset (via transformation URL)
    const transformedUrl = originalUrl.replace(
      "/original/",
      `/default/${PIXELBIN_PRESET}/`
    );

    res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("Erreur Pixelbin :", err);
    res.status(500).json({ error: "Erreur Pixelbin", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 API Pixelbin démarrée sur le port ${PORT}`);
});
