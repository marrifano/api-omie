const express = require("express");
const router = express.Router();
const contasAPagarController = require("../controllers/contasAPagarController");

    router.get("/listar", contasAPagarController.listarContasAPagar);
    router.get("/enviarPorData", contasAPagarController.incluirContaPagar);
 
    router.get("/enviar", contasAPagarController.enviarContaIndividual);
    

module.exports = router;
