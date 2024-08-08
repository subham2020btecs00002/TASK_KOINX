const express = require("express");
const multer = require("multer");
const { uploadTrades, getBalances } = require("../controllers/tradeController");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), uploadTrades);
router.post("/balance", getBalances);

module.exports = router;
