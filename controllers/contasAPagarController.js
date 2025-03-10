
const axios = require("axios");
const https = require("https");
const readline = require("readline");  
const { salvarLog } = require("../utilitarios/logService");
const { getConnection } = require("../config/database");
const { esperar, formatarData } = require("../utilitarios/auxiliares");
const { gerarPayload } = require("../utilitarios/payloads");

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;
const OMIE_URL = "https://app.omie.com.br/api/v1/financas/contapagar/";
const OMIE_CATEGORIA_URL = "https://app.omie.com.br/api/v1/geral/categorias/";
const OMIE_CLIENTES_URL = "https://app.omie.com.br/api/v1/geral/clientes/";
const OMIE_CCORRENTE_URL = "https://app.omie.com.br/api/v1/geral/contacorrente/";

 
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function aguardarEnter() {
    return new Promise(resolve => {
        rl.question("⏳ Pressione ENTER para enviar este registro...", () => resolve());
    });
}

const agent = new https.Agent({ keepAlive: true, minVersion: "TLSv1.2" });
const headers = {
    "Content-Type": "application/json",
    "X-Omie-App-Key": OMIE_APP_KEY,
    "X-Omie-App-Secret": OMIE_APP_SECRET
};
  
    async function listarContasAPagar(req, res) {   
        try {
            const payload = gerarPayload("ListarContasPagar", [{ "pagina": 1, "registros_por_pagina": 500, "apenas_importado_api": "N" }]);    
            console.log("🔍 Buscando contas a pagar..."); 

            const response = await axios.post(OMIE_URL, payload, { headers, httpsAgent: agent }); 
            res.json({ mensagem: "Contas a pagar listadas com sucesso!", contas_correntes: response.data }); 
        } catch (error) {
            console.error("❌ Erro ao listar contas a pagar:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    async function buscarCategoriasOmie() {
        await esperar(1000); 
        try { 
            console.log("🔍 Carregando as categorias no Omie...");

            const payload = gerarPayload("ListarCategorias", [{ "pagina": 1, "registros_por_pagina": 2 }]); 
            const response = await axios.post(OMIE_CATEGORIA_URL, payload, { headers, httpsAgent: agent }); 
            console.log(response.data.categoria_cadastro)
            if (response.data && response.data.categoria_cadastro) {
                return response.data.categoria_cadastro.map(categoria => ({
                    codigo: categoria.codigo,
                    descricao: categoria.descricao
                }));
            }
            
            return [];
        } catch (error) {
            console.error("❌ Erro ao buscar categorias no Omie:", error);
            return [];
        }
    }

    async function buscarCodigoContaCorrente(idContaCorrente) {  
        try {
            await esperar(1000);   
            const payload = gerarPayload("ListarContasCorrentes", [{ "pagina": 1, "registros_por_pagina": 150 }]);
            const response = await axios.post(OMIE_CCORRENTE_URL, payload, { headers, httpsAgent: agent });
     
            if (response.data && response.data.ListarContasCorrentes) { 
                const contasMap = response.data.ListarContasCorrentes.map(conta => ({
                    nCodCC: conta.nCodCC,
                    cCodCCInt: conta.cCodCCInt }));
    
             const contaEncontrada = contasMap.find(conta => conta.cCodCCInt === idContaCorrente);
                 console.log(`CONTA ENCONTRADA PARA O ID: ${idContaCorrente} || CONTA:`, contaEncontrada)
                if (contaEncontrada) {
                    return contaEncontrada.nCodCC; 
                } else {
                    console.warn(`⚠️ Conta corrente não encontrada para o código: ${idContaCorrente}`);
                    return null;
                }
            }

            return [];
        } catch (error) {
            console.error("❌ Erro ao buscar contas correntes no Omie:", error);
            return [];
        }
    }
    
    async function buscarClienteOmie(codigoClienteRM) {
        try {
            await esperar(1000); 
            
            const payload = gerarPayload("ConsultarCliente", [{ "codigo_cliente_integracao": codigoClienteRM }]);  
            console.log(`🔍 Buscando cliente no Omie: ${codigoClienteRM}`);

            const response = await axios.post(OMIE_CLIENTES_URL, payload, { headers, httpsAgent: agent });

            if (response.data && response.data.codigo_cliente_omie) {
                return response.data.codigo_cliente_omie;   
            } else {
                console.warn(`⚠️ Cliente não encontrado no Omie: ${codigoClienteRM}`);
                return null;  
            }
        } catch (error) {
            console.error(`❌ Erro ao buscar cliente ${codigoClienteRM}:`, error.response?.data || error.message);
            return null;
        }
    }

    async function buscarContasPagarRM() {
        let connection;
        try {
            connection = await getConnection();

            const sql = `
                    SELECT distinct  
                            L.IDLAN AS codigo_lancamento_integracao,   
                            L.CODCFO AS codigo_cliente_fornecedor,
                            L.DATAVENCIMENTO as data_vencimento,       
                            L.VALORORIGINAL as valor_documento,
                            NVL(T.DESCRICAO, 'PADRAO_OMIE') AS codigo_categoria,
                            L.DATAPREVBAIXA as data_previsao,        
                            L.CODCXA as id_conta_corrente 
                    
                        FROM FLAN L    
                            LEFT JOIN GFILIAL F ON L.CODCOLIGADA = F.CODCOLIGADA AND L.CODFILIAL = F.CODFILIAL
                            LEFT JOIN FCFO C ON L.CODCFO = C.CODCFO 
                            LEFT JOIN TMOV M ON M.CODCOLIGADA = F.CODCOLIGADA AND M.IDMOV = L.IDMOV 
                            LEFT JOIN FCXA CX ON CX.CODCXA = L.CODCXA  
                            LEFT JOIN GBANCO B ON B.NUMBANCO = CX.NUMBANCO  
                            LEFT JOIN FLANBAIXA FBAIXA ON FBAIXA.IDLAN = L.IDLAN AND FBAIXA.CODCOLIGADA = L.CODCOLIGADA AND FBAIXA.CODFILIAL = L.CODFILIAL 
                            LEFT JOIN GCCUSTO CC ON CC.CODCCUSTO = FBAIXA.CODCCUSTO AND CC.CODCOLIGADA = FBAIXA.CODCOLIGADA
                            LEFT JOIN FLANRATCCU NATU ON NATU.CODCCUSTO = CC.CODCCUSTO AND NATU.IDLAN = FBAIXA.IDLAN AND NATU.CODCOLIGADA = L.CODCOLIGADA
                            LEFT JOIN TTBORCAMENTO T ON NATU.CODCOLIGADA = T.CODCOLIGADA AND NATU.CODNATFINANCEIRA = T.CODTBORCAMENTO
                            LEFT JOIN GDEPTO DEPT ON DEPT.CODDEPARTAMENTO = L.CODDEPARTAMENTO AND DEPT.CODCOLIGADA = L.CODCOLIGADA AND L.CODFILIAL = DEPT.CODFILIAL

                        WHERE 
                            L.DATAVENCIMENTO = TO_DATE('01/03/2025', 'DD/MM/YYYY')
                            AND L.PAGREC = 2 
                            AND L.CODCOLIGADA IN (1, 8, 10, 12, 15, 16, 21)
                            AND L.STATUSLAN IN (0, 1)
                            AND FBAIXA.DATACANCELBAIXA IS NULL  
            `; 
            const result = await connection.execute(sql); 
            return result.rows.map((row) => ({
                codigo_lancamento_integracao: row[0],
                codigo_cliente_fornecedor: row[1],
                data_vencimento: row[2],
                valor_documento: row[3], 
                codigo_categoria: row[4], 
                data_previsao: row[5],
                id_conta_corrente: row[6],
            }));
    
        } catch (error) {
            console.error("❌ Erro ao buscar contas a pagar no RM:", error);
            return [];
        } finally {
            if (connection) {
                await connection.close();
            }
        }
    } 

    async function incluirContaPagar(req, res) { 
        try {
            const categoriasOmie = await buscarCategoriasOmie(); 
            const contasRM = await buscarContasPagarRM(); 
            
        const codigoPadrao = "0.01.98"; 
 
        for (let conta of contasRM) {  
            conta.codigo_cliente_fornecedor = await buscarClienteOmie(conta.codigo_cliente_fornecedor) || "0"; //ACHAR CLIENTE  
            const codigoConta = await buscarCodigoContaCorrente(conta.id_conta_corrente); //ACHAR CONTA CORRENTE 
          
            if (codigoConta) {
                conta.id_conta_corrente = codigoConta;
            }  
            
            //ACHAR A CATEGORIA
            console.log('Descricao: ', categoriasOmie)
            console.log('Conta codigo: ', conta.codigo_categoria)
            const categoriaEncontrada = categoriasOmie.find(cat => cat.descricao === conta.codigo_categoria);
            conta.codigo_categoria = categoriaEncontrada ? categoriaEncontrada.codigo : codigoPadrao; 
        } 
        
        contas = contas.map(conta => {  
            let contaFormatada = {
                ...conta,
                data_vencimento: formatarData(conta.data_vencimento),
                data_previsao: formatarData(conta.data_previsao),
            };
         
            return contaFormatada;
        });

            console.log("📦 Contas formatadas antes do envio:", JSON.stringify(contas, null, 2));
            console.log("Finalizado") 

        const resultados = await enviarParaOmie(contas);
            res.json({ mensagem: "Contas a pagar enviadas com sucesso!", contas_pagar: resultados });
       } catch (error) {
        console.error("❌ Erro geral:", error);
            res.status(500).json({ erro: error.message });
    }
    }
    
    async function enviarParaOmie(contas) {
        const resultados = [];
        const sucesso = [];
        const erros = [];

            console.log("📦 Contas formatadas antes do envio:", JSON.stringify(contas, null, 2)); 

        for (const conta of contas) {
            try {
                await esperar(1000); 

                console.log("\n🔍 PRÓXIMA CONTA A SER ENVIADA:");
                console.log(JSON.stringify(conta, null, 2));
 
                await aguardarEnter();

                const payload = gerarPayload("UpsertContaPagar", [conta]);
 
                console.log(` Enviando conta: ${conta.codigo_lancamento_integracao}`);
                const response = await axios.post(OMIE_URL, payload, {
                    headers: headers,
                    httpsAgent: agent,
                }); 
    
                console.log(`✅ Conta "${conta.codigo_lancamento_integracao}" enviada com sucesso!`);
                sucesso.push(conta);
                resultados.push(response.data);
            } catch (error) {
                const mensagemErro = `Erro ao enviar conta ${conta.codigo_lancamento_integracao}: ${error.response?.data?.faultstring || error.message}`;
                console.error(`❌ ${mensagemErro}`);
                erros.push({ conta, erro: mensagemErro });
            }
        }

        rl.close(); 

        // CRIAR ARQUIVO LOG DE ENVIO
        salvarLog("log_contas", sucesso, erros); 
        return resultados;
    } 

module.exports = { listarContasAPagar, incluirContaPagar };
