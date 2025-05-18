app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Aucune image envoyée." });
  }

  try {
    const { buffer, originalname } = req.file;

    // Nettoyage du nom
    const basename = originalname
      .replace(/\s+/g, "_")
      .replace(/[\(\)]/g, "")
      .replace(/\.\w+$/, "");

    const uniqueName = `${basename}-${Date.now()}`;
    const format = (originalname.match(/\.(\w+)$/) || [])[1] || "png";

    console.log("⏫ Tentative d’upload :", uniqueName);

    const upResult = await pixelbin.uploader.upload({
      file: buffer,
      name: uniqueName,
      path: PIXELBIN_UPLOAD_DIR,
      format,
      access: "public-read",
      overwrite: true,
    });

    console.log("✅ Upload réussi :", upResult);

    const originalUrl = upResult.url;

    if (!originalUrl.includes("/original/")) {
      console.error("❌ L’URL retournée ne contient pas /original/ :", originalUrl);
      return res.status(500).json({ error: "URL d’upload invalide" });
    }

    const transformedUrl = originalUrl.replace("/original/", "/sr.upscale(t:4x)/");

    res.json({ originalUrl, transformedUrl });
  } catch (err) {
    console.error("❌ Erreur upload Pixelbin :", err.message, err);
    res.status(500).json({ error: "Erreur backend Pixelbin", details: err.message });
  }
});
