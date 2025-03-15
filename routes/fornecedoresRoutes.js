const express = require("express");
const router = express.Router();
const fornecedoresController = require("../controllers/fornecedoresController");
 

router.get("/listar", contasCorrentesController.listarContasCorrentes);
router.get("/incluir", contasCorrentesController.incluirContaCorrente); 
router.get("/deletarTudo", contasCorrentesController.excluirTodasContasCorrentesOmie);
 
 
router.get("/sem-integracao", fornecedoresController.listarFornecedoresSemIntegracao); 
router.post("/buscar-rm", fornecedoresController.buscarFornecedorRM); 
router.delete("/excluir-omie/:codigo_fornecedor", fornecedoresController.excluirFornecedorOmie); 
router.post("/recriar-omie", fornecedoresController.recriarFornecedorOmie);

module.exports = router;
