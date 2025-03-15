
const axios = require("axios");
const https = require("https"); 
const { aguardarEnter } = require("../utilitarios/readlineHelper");
const { salvarLog } = require("../utilitarios/logService"); 
const { esperar, formatarData } = require("../utilitarios/auxiliares");
const { gerarPayload } = require("../utilitarios/payloads");
const { buscarContasPagarRM } = require("../services/rmService");  
const { buscarCategoriasOmie, buscarCodigoContaCorrente, buscarClienteOmie  } = require("../services/omieService");  

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;
const OMIE_URL = "https://app.omie.com.br/api/v1/financas/contapagar/";   
   
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
 
    async function incluirContaPagar(req, res) { 
        dataDeVencimento = "13/03/2025"

      try { 
            const contasRM = await buscarContasPagarRM(dataDeVencimento);  
            const categoriasOmie = await buscarCategoriasOmie();    
            const codigoPadrao = "2.02.99";  
            

            for (let conta of contasRM) {  
                conta.codigo_cliente_fornecedor = await buscarClienteOmie(conta.codigo_cliente_fornecedor) || "0"; //ACHAR CLIENTE.  
                const codigoConta = await buscarCodigoContaCorrente(conta.id_conta_corrente); //ACHAR CONTA CORRENTE.
        
                if (codigoConta) {
                    console.log(`Substituindo id, da conta corrente ${conta.id_conta_corrente}  por: ${codigoConta}`)
                    conta.id_conta_corrente = codigoConta;
                }  
                console.log("Código Consolidado: ", codigoConta)

                //ACHAR A CATEGORIA 
                console.log('CATEGORIA: ', conta.codigo_categoria)
                const categoriaEncontrada = categoriasOmie.find(cat => cat.descricao === conta.codigo_categoria);
                conta.codigo_categoria = categoriaEncontrada ? categoriaEncontrada.codigo : codigoPadrao; 
            } 
      
        const contasFormatadas = contasRM.map(conta => {  
            return {
                ...conta,
                data_vencimento: formatarData(conta.data_vencimento),
                data_previsao: formatarData(conta.data_previsao),
            };
        });
        
        console.log("📦 Contas formatadas antes do envio:", JSON.stringify(contasFormatadas, null, 2));
        console.log("Finalizado") 

        const resultados = await enviarParaOmie(contasFormatadas);
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
