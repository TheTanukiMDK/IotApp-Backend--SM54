const express = require("express");
const {getSensoresGeneralesHumedad, getSensoresGeneralesPorDia, getSensoresGeneralesPorHora} = require("../controllers/sensoresController");

const router = express.Router();
router.get("/por-dia", getSensoresGeneralesPorDia);
router.get("/por-hora", getSensoresGeneralesPorHora);
router.get("/porcentaje-humedad", getSensoresGeneralesHumedad);

module.exports = router;