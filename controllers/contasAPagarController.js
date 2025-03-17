
const axios = require("axios");
const https = require("https");  
const { formatarData } = require("../utilitarios/auxiliares");
const { salvarLog } = require("../utilitarios/logService");
const { gerarPayload } = require("../utilitarios/payloads");
const { buscarContasPagarRM } = require("../services/rmService");  
const { buscarCategoriasOmie, 
    buscarCodigoContaCorrente, 
    buscarClienteOmie,
    enviarParaOmieBaixadas,
    enviarParaOmieNaoBaixadas  } = require("../services/omieService");  

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

            const response = await axios.post(OMIE_URL, payload, { headers, httpsAgent: agent,  timeout: 15000 }); 
            res.json({ mensagem: "Contas a pagar listadas com sucesso!", contas_correntes: response.data }); 
        } catch (error) {
            console.error("❌ Erro ao listar contas a pagar:", error.message);
            res.status(500).json({ error: error.message });
        }
    }
 

    async function incluirContaPagar(req, res) { 

      try {  
            dataDeVencimento = req.query.data

            const contasRM = await buscarContasPagarRM(dataDeVencimento);  
            const categoriasOmie = await buscarCategoriasOmie();    
            const codigoPadrao = "2.02.99";  
 
            const contasBaixadas = [];
            const contasNaoBaixadas = [];
            

            for (let conta of contasRM) {   
                conta.codigo_cliente_fornecedor = await buscarClienteOmie(conta.codigo_cliente_fornecedor); //ACHAR CLIENTE.
                console.log("📌 Codigo do cliente utilizado2:", conta.codigo_cliente_fornecedor)  
                const codigoConta = await buscarCodigoContaCorrente(conta.id_conta_corrente); //ACHAR CONTA CORRENTE.
        
                if (codigoConta) {
                    console.log(`Substituindo id, da conta corrente ${conta.id_conta_corrente}  por: ${codigoConta}`)
                    conta.id_conta_corrente = codigoConta;
                }   

                //ACHA A CATEGORIA 
                console.log('🔍 Buscando código da categoria: ', conta.codigo_categoria)
                const categoriaEncontrada = categoriasOmie.find(cat => cat.descricao === conta.codigo_categoria);
                conta.codigo_categoria = categoriaEncontrada ? categoriaEncontrada.codigo : codigoPadrao; 
                  
                //FORMATA DATAS
                conta.data_vencimento = formatarData(conta.data_vencimento)  
                conta.data_previsao = formatarData(conta.data_previsao)
                conta.data_baixa = formatarData(conta.data_baixa)
 
                // SEPARA CONTAS BAIXADAS DAS NÃO BAIXADAS 
                if (conta.statuslan == 1) {
                    console.log("✅ Conta paga identificada. ");
                    contasBaixadas.push(conta);
                } else {
                    console.log("⚠️ Conta não paga identificada.");
                    contasNaoBaixadas.push(conta);
                }
            }  
            
            console.log(`📌 Total de contas baixadas: ${contasBaixadas.length}`);
            console.log(`📌 Total de contas não baixadas: ${contasNaoBaixadas.length}`);
 
        // Envia separadamente as duas listas
        const resultadosNaoBaixadas = await enviarParaOmieNaoBaixadas(contasNaoBaixadas);
        const resultadosBaixadas = await enviarParaOmieBaixadas(contasBaixadas);  

        salvarLog("log_contas_nao_baixadas", resultadosNaoBaixadas.sucesso, resultadosNaoBaixadas.erros); 
        salvarLog("log_contas_baixadas", resultadosBaixadas.sucesso, resultadosBaixadas.erros); 


       // const resultados = await enviarParaOmie(contasFormatadas); 
        res.json({ 
            mensagem: "Contas a pagar enviadas com sucesso!",
            baixadas: resultadosBaixadas,
            nao_baixadas: resultadosNaoBaixadas
        });

    } catch (error) {
      console.error("❌ Erro geral:", error);
          res.status(500).json({ erro: error.message });
  
        } 
    } 

    
    

module.exports = { listarContasAPagar, incluirContaPagar };
