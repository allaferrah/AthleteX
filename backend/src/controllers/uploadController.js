const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});

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

exports.uploadFile = (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadMultiple = (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: "No files uploaded" });
    const urls = req.files.map(
      (f) => `http://localhost:5000/uploads/${f.filename}`
    );
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
