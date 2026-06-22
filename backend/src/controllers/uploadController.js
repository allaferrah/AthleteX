const multer = require("multer");
const path = require("path");
const getSupabase = require("../lib/supabase");

const BUCKET = "athletix-uploads";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype.split("/")[1]);
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error("Only image files (jpg, png, gif, webp, svg) are allowed"));
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

async function ensureBucket() {
  const supabase = getSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

async function uploadToSupabase(file) {
  const supabase = getSupabase();
  const ext = path.extname(file.originalname);
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filename);
  return { url: publicUrl, filename };
}

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    await ensureBucket();
    const result = await uploadToSupabase(req.file);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: "No files uploaded" });
    await ensureBucket();
    const results = await Promise.all(req.files.map(uploadToSupabase));
    res.json({ urls: results.map((r) => r.url) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
