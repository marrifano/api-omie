const express = require("express");
const router = express.Router();
const departamentosController = require("../controllers/departamentosController");

router.get("/criar", departamentosController.criarDepartamento);
router.get("/listar", departamentosController.listarDepartamentos);
router.get("/buscar", departamentosController.buscarDepartamentos);

module.exports = router;
