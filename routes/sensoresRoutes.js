const express = require("express");
const {
    getSensoresPorHora,
    getSensoresPorDia,
    getPorcentajeHumedad,
} = require("../controllers/sensoresController");

const router = express.Router();

router.get("/:id_parcela/por-hora", getSensoresPorHora);
router.get("/:id_parcela/por-dia", getSensoresPorDia);
router.get("/:id_parcela/porcentaje-humedad", getPorcentajeHumedad);


module.exports = router;