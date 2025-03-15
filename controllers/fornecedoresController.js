const axios = require("axios");
const { buscarFornecedorRM } = require("../services/rmService");
const { listarFornecedoresOmie, excluirFornecedorOmie, criarFornecedorOmie } = require("../services/omieService");

const OMIE_URL = "https://app.omie.com.br/api/v1/geral/clientes/";
const headers = {
    "Content-Type": "application/json",
    "X-Omie-App-Key": process.env.OMIE_APP_KEY,
    "X-Omie-App-Secret": process.env.OMIE_APP_SECRET
};

// Listar fornecedores sem código de integração
async function listarFornecedoresSemIntegracao(req, res) {
    try {
        const fornecedores = await listarFornecedoresOmie();
        const semIntegracao = fornecedores.filter(f => !f.codigo_integracao);
        res.json({ mensagem: "Fornecedores sem código de integração listados com sucesso!", fornecedores: semIntegracao });
    } catch (error) {
        console.error("Erro ao listar fornecedores sem integração:", error);
        res.status(500).json({ erro: error.message });
    }
}

// Buscar fornecedor no RM
async function buscarFornecedorRMController(req, res) {
    try {
        const { cnpj } = req.body;
        if (!cnpj) return res.status(400).json({ erro: "CNPJ é obrigatório." });

        const fornecedorRM = await buscarFornecedorRM(cnpj);
        if (!fornecedorRM) return res.status(404).json({ erro: "Fornecedor não encontrado no RM." });

        res.json({ mensagem: "Fornecedor encontrado no RM!", fornecedor: fornecedorRM });
    } catch (error) {
        console.error("Erro ao buscar fornecedor no RM:", error);
        res.status(500).json({ erro: error.message });
    }
}

// Excluir fornecedor no Omie
async function excluirFornecedorOmieController(req, res) {
    try {
        const { codigo_fornecedor } = req.params;
        await excluirFornecedorOmie(codigo_fornecedor);
        res.json({ mensagem: "Fornecedor excluído do Omie com sucesso!" });
    } catch (error) {
        console.error("Erro ao excluir fornecedor no Omie:", error);
        res.status(500).json({ erro: error.message });
    }
}

// Recriar fornecedor no Omie
async function recriarFornecedorOmie(req, res) {
    try {
        const { fornecedor } = req.body;
        if (!fornecedor || !fornecedor.codigo_integracao) {
            return res.status(400).json({ erro: "Dados do fornecedor inválidos." });
        }

        await criarFornecedorOmie(fornecedor);
        res.json({ mensagem: "Fornecedor recriado com sucesso no Omie!" });
    } catch (error) {
        console.error("Erro ao recriar fornecedor no Omie:", error);
        res.status(500).json({ erro: error.message });
    }
}

module.exports = {
    listarFornecedoresSemIntegracao,
    buscarFornecedorRMController,
    excluirFornecedorOmieController,
    recriarFornecedorOmie
};
