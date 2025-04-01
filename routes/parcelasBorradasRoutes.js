const express = require("express");
const { getParcelasBorradas } = require("../controllers/parcelasController");

const router = express.Router();


router.get("/", getParcelasBorradas); // Ruta para obtener parcelas borradas

module.exports = router;