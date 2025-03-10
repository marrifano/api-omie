const express = require("express");
const router = express.Router();
const departamentosController = require("../controllers/departamentosController");

router.get("/incluir", departamentosController.incluirDepartamento);
router.get("/listar", departamentosController.listarDepartamentos);
router.get("/buscar", departamentosController.buscarDepartamentos);

module.exports = router;
