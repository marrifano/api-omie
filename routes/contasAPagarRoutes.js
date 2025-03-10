const express = require("express");
const router = express.Router();
const contasAPagarController = require("../controllers/contasAPagarController");

    router.get("/listar", contasAPagarController.listarContasAPagar);
    router.get("/incluir", contasAPagarController.incluirContaPagar);

module.exports = router;
