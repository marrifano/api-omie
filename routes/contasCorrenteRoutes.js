const express = require("express");
const router = express.Router();
const contasCorrentesController = require("../controllers/contasCorrenteController");
 

router.get("/listar", contasCorrentesController.listarContasCorrentes);
router.get("/incluir", contasCorrentesController.incluirContaCorrente);


router.get("/deletarTudo", contasCorrentesController.excluirTodasContasCorrentesOmie);

module.exports = router;
