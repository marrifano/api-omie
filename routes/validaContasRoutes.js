const express = require("express");
const { validarContasPorDia, validarContasPorMes } = require("../controllers/validarContasController");
const router = express.Router();
 
router.get("/contaPorDia", validarContasPorDia);
router.get("/contaPorMes", validarContasPorMes);

module.exports = router;
