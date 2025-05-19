require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { PixelbinConfig, PixelbinClient } = require("@pixelbin/admin");

const app = express();
const upload = multer();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.static("public"));

const {
  PIXELBIN_API_TOKEN,
  PIXELBIN_CLOUD_NAME,
  PIXELBIN_ZONE_SLUG,
  PIXELBIN_UPLOAD_DIR,
  PIXELBIN_PRESET_NAME,
  OUTSETA_API_KEY
} = process.env;

const pixelbin = new PixelbinClient(
  new PixelbinConfig({
    domain: "https://api.pixelbin.io",
    cloudName: PIXELBIN_CLOUD_NAME,
    zoneSlug: PIXELBIN_ZONE_SLUG,
    apiSecret: PIXELBIN_API_TOKEN,
  })
);

// Vérifie Outseta + crédits
async function checkAndDecrementCredits(req) {
  const authToken = req.headers.cookie
    ?.split(";")
    .find(c => c.trim().startsWith("Outseta-Auth="))
    ?.split("=")[1];

  if (!authToken) {
    throw new Error("Non authentifié via Outseta.");
  }

  // 🔍 Récupérer l'utilisateur
  const userRes = await axios.get("https://app.outseta.com/api/auth/current", {
    headers: {
      "Authorization": `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });

  const user = userRes.data;
  if (!user || user.CrmPerson?.CustomFields?.credits == null) {
    throw new Error("Utilisateur ou crédits non trouvés.");
  }

  const currentCredits = user.CrmPerson.CustomFields.credits;

  if (currentCredits < 1) {
    throw new Error("Crédits insuffisants.");
  }

  // ✏️ Mise à jour des crédits (décrémentation)
  const personId = user.CrmPerson.Uid;

  await axios.put(
    `https://app.outseta.com/api/crm/people/${personId}`,
    {
      CustomFields: {
        credits: currentCredits - 1,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${OUTSETA_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
}

app.post("/upscale", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Aucune image envoyée." });
  }

  try {
    // Vérification de l'utilisateur et crédits
    await checkAndDecrementCredits(req);

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

    res.json({ success: true, url: transformedUrl });
  } catch (err) {
    console.error("Erreur upscale:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ API d’amélioration d’image prête.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur actif sur le port ${PORT}`);
});
