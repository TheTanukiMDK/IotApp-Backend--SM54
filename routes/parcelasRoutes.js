const express = require("express");
const { getParcelas, getParcelaById } = require("../controllers/parcelasController");

const router = express.Router();

router.get("/", getParcelas);
router.get("/:id", getParcelaById); 

module.exports = router;