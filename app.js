require("dotenv").config();
const express = require("express");
const https = require("https");
const fs = require("fs");
const cors = require("cors"); 

const departamentosRoutes = require("./routes/departamentosRoutes");
const contasCorrentesRoutes = require("./routes/contasCorrenteRoutes");
const contasAPagarRoutes = require("./routes/contasAPagarRoutes");
const validarContasRoutes = require("./routes/validaContasRoutes");

const { iniciarPolling } = require("./pollingService");
const app = express();

app.use(express.json());
app.use(cors());

// Rotas
app.use("/api/departamentos", departamentosRoutes);
app.use("/api/contasCorrentes", contasCorrentesRoutes);
app.use("/api/contaspagar", contasAPagarRoutes);  

app.use("/api/validacao", validarContasRoutes); 
 
// Configuração SSL
const sslOptions = {
    key: fs.readFileSync("localhost-key.pem"),
    cert: fs.readFileSync("localhost.pem")
};
 
iniciarPolling(); 

// Iniciar Servidor HTTPS
https.createServer(sslOptions, app).listen(3000, () => {
    console.log("🚀 Servidor rodando com HTTPS na porta 3000...");
});
