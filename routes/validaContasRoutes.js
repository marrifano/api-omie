const express = require("express");
const { validarContasPorDia, validarContasPorMes, validaConta } = require("../controllers/validarContasController");
const router = express.Router();
 
router.get("/conta", validaConta);
router.get("/contaPorDia", validarContasPorDia);
router.get("/contaPorMes", validarContasPorMes); 
//router.get("/atualizacao", validacao);

module.exports = router;
