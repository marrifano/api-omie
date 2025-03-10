const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;
const OMIE_URL = "https://app.omie.com.br/api/v1/geral/departamentos/";

const headers = {
    "Content-Type": "application/json",
    "X-Omie-App-Key": OMIE_APP_KEY,
    "X-Omie-App-Secret": OMIE_APP_SECRET
};

const agent = new https.Agent({ keepAlive: true, minVersion: "TLSv1.2" });

async function incluirDepartamento(req, res) {
    try { 
        const departamentosPath = path.join(__dirname, "../modelos/departamentos.json");
        const departamentos = JSON.parse(fs.readFileSync(departamentosPath, "utf-8"));

        const resultados = [];
        for (const dep of departamentos) {
            const payload = {
                call: "IncluirDepartamento",
                app_key: OMIE_APP_KEY,
                app_secret: OMIE_APP_SECRET,
                param: [{ "codigo": dep.codigo, "descricao": dep.descricao }]
            };
            
            console.log("Enviando departamento:", dep.descricao);
            const response = await axios.post(OMIE_URL, payload, { headers, httpsAgent: agent });
            console.log(`✅ Departamento "${dep.descricao}" criado!`, response.data);
            resultados.push(response.data);
        }

        res.json({ mensagem: "Novo departamento criado!", novo_departamento: resultados });
    } catch (error) {
        console.error("❌ Erro:", error.message);
        res.status(500).json({ error: error.message });
    }
}

async function listarDepartamentos(req, res) {
    try {
        const payload = {
            call: "ListarDepartamentos",
            app_key: OMIE_APP_KEY,
            app_secret: OMIE_APP_SECRET,
            param: [{ "pagina": 1, "registros_por_pagina": 50 }]
        };
         
        const response = await axios.post(OMIE_URL, payload, { headers, httpsAgent: agent });
        console.log(`✅ Departamentos listados com sucesso!`, response.data);
        
        res.json({ mensagem: "Departamentos listados com sucesso!", departamentos: response.data });
    } catch (error) {
        console.error("❌ Erro:", error.message);
        res.status(500).json({ error: error.message });
    }
}

async function buscarDepartamentos(req, res) {
    return listarDepartamentos(req, res);
}

module.exports = { incluirDepartamento, listarDepartamentos, buscarDepartamentos };
