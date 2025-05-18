require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app = express();
const upload = multer();
app.use(cors());
app.use(express.static("public")); // ← Sert les fichiers HTML du dossier public

// 🔐 Variables d’environnement
const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET
} = process.env;

// 🔧 Configuration SDK Pixelbin
const config = new PixelbinConfig({
  domain: "https://api.pixelbin.io",
  cloudName: PIXELBIN_CLOUD_NAME,
  zoneSlug: PIXELBIN_ZONE_SLUG,
  apiSecret: PIXELBIN_API_TOKEN,
});
const pixelbin = new PixelbinClient(config);

// 📤 Endpoint d'upload
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

    const uploadResult = await pixelbin.uploader.upload({
      file: buffer,
      name: uniqueName,
      path: PIXELBIN_UPLOAD_DIR,
      format: extension,
      access: "public-read",
      overwrite: true,
    });

    const originalUrl = uploadResult.url;

    // 🧠 Construire l’URL transformée avec le preset défini
    const transformedUrl = originalUrl.replace("/original/", `/${PIXELBIN_PRESET}/`);

    res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur Pixelbin :", err);
    res.status(500).json({ error: "Erreur Pixelbin", details: err.message });
  }
});

// ✅ Le serveur
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy PixelBin démarré sur http://localhost:${PORT}`);
});
