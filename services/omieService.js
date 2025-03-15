const axios = require("axios");
const https = require("https");  

const { esperar, formatarData, aguardarEnter } = require("../utilitarios/auxiliares");
const { gerarPayload } = require("../utilitarios/payloads"); 

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;
 
const OMIE_URLS = {
  CATEGORIAS: "https://app.omie.com.br/api/v1/geral/categorias/",
  CONTAS_CORRENTES: "https://app.omie.com.br/api/v1/geral/contacorrente/",
  CLIENTES: "https://app.omie.com.br/api/v1/geral/clientes/",
  CONTAS_PAGAR: "https://app.omie.com.br/api/v1/financas/contapagar/"

};

const agent = new https.Agent({ keepAlive: true, minVersion: "TLSv1.2" });

const headers = {
    "Content-Type": "application/json",
    "X-Omie-App-Key": OMIE_APP_KEY,
    "X-Omie-App-Secret": OMIE_APP_SECRET
};
    
    async function buscarCategoriasOmie() {
        await esperar(1000);  

        try { 
            console.log("🔍 Carregando as categorias no Omie...");

            const payload = gerarPayload("ListarCategorias", [{ "pagina": 1, "registros_por_pagina": 500}]); 
            const response = await axios.post(OMIE_URLS.CATEGORIAS, payload, { headers, httpsAgent: agent }); 
    

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

            const payload = gerarPayload("ListarContasCorrentes", [{ "pagina": 1, "registros_por_pagina": 300 }]);
            const response = await axios.post(OMIE_URLS.CONTAS_CORRENTES, payload, { headers, httpsAgent: agent });

            if (response.data && response.data.ListarContasCorrentes) {   
    
                const contasMap = response.data.ListarContasCorrentes.map(conta => ({
                    nCodCC: conta.nCodCC,
                    descricao: conta.descricao 
                }));  
                console.log(idContaCorrente) 
                const contaEncontrada = contasMap.find(conta =>  conta.descricao === idContaCorrente); 

                if (contaEncontrada) {
                    return contaEncontrada.nCodCC; 
                } else {
                    console.warn(`⚠️ Conta corrente não encontrada para o código: ${idContaCorrente}`);
                    return null;
                }
            }

            return null;
        } catch (error) {
            console.error("❌ Erro ao buscar contas correntes no Omie:", error);
            return null;
        }
    }
 
    async function buscarClienteOmie(codigoClienteRM) {
        try {
            await esperar(700); 
            
            const payload = gerarPayload("ConsultarCliente", [{ "codigo_cliente_integracao": codigoClienteRM }]);  
            console.log(`🔍 Buscando cliente no Omie: ${codigoClienteRM}`);

            const response = await axios.post(OMIE_URLS.CLIENTES, payload, { headers, httpsAgent: agent });

            if (response.data && response.data.codigo_cliente_omie) {
            console.log('Cliente Encontrado: ', response.data.codigo_cliente_omie);   
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
/* 
    async function enviarParaOmie(contas) {
    console.log("Enviar arquivo, acessado")
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
 
    // CRIAR ARQUIVO LOG DE ENVIO
    salvarLog("log_contas", sucesso, erros); 
    return resultados;
    } 
*/   
    async function enviarParaOmieBaixadas(contas) { 
        const resultados = [];
        const sucesso = [];
        const erros = [];

        for (const conta of contas) {
            try {
                await esperar(1000); 

                console.log("\n🔍 PRÓXIMA CONTA BAIXADA A SER ENVIADA:");
                console.log(JSON.stringify(conta, null, 2));

                await aguardarEnter();

                // Primeiro envia a conta com UpsertContaPagar
                const payloadConta = gerarPayload("UpsertContaPagar", [{
                    codigo_lancamento_integracao: conta.codigo_lancamento_integracao,
                    codigo_cliente_fornecedor: conta.codigo_cliente_fornecedor,
                    data_vencimento: conta.data_vencimento,
                    valor_documento: conta.valor_documento,
                    codigo_categoria: conta.codigo_categoria,
                    data_previsao: conta.data_previsao,
                    id_conta_corrente: conta.id_conta_corrente,
                }]);

                const responseConta = await axios.post(OMIE_URLS.CONTAS_PAGAR, payloadConta, {
                    headers,
                    httpsAgent: agent,
                });

                console.log(`✅ Conta "${conta.codigo_lancamento_integracao}" enviada com sucesso!`);
  
                const payloadPagamento = gerarPayload("LancarPagamento", [{
                    codigo_lancamento_integracao: conta.codigo_lancamento_integracao,
                    data: conta.data_baixa,
                    valor: conta.valor_documento,
                    desconto: conta.desconto,
                    juros: conta.juros,
                    multa: conta.multa,
                    codigo_conta_corrente: conta.id_conta_corrente,
                    observacao: conta.observacao || "Pagamento lançado via integração"
                }]);

                const responsePagamento = await axios.post(OMIE_URLS.CONTAS_PAGAR, payloadPagamento, {
                    headers,
                    httpsAgent: agent,
                });

                console.log(`💰 Pagamento para conta "${conta.codigo_lancamento_integracao}" enviado com sucesso!`);

                sucesso.push({
                    conta: responseConta.data,
                    pagamento: responseConta.data
                });
                resultados.push({
                    conta: responseConta.data,
                    pagamento: responseConta.data
                });
 
            } catch (error) {
                const mensagemErro = `Erro ao enviar conta ${conta.codigo_lancamento_integracao}: ${error.response?.data?.faultstring || error.message}`;
                console.error(`❌ ${mensagemErro}`);
                erros.push({ conta, erro: mensagemErro });
            }
        }

         return { resultados, sucesso, erros };
    }


    async function enviarParaOmieNaoBaixadas(contas) { 
        const resultados = [];
        const sucesso = [];
        const erros = []; 

        for (const conta of contas) {
            try {
                await esperar(1000); 

                console.log("\n🔍 CONTA EM ABERTO A SER ENVIADA: ");
                console.log(JSON.stringify(conta, null, 2));

                await aguardarEnter();

                const payload = gerarPayload("UpsertContaPagar", [{
                    codigo_lancamento_integracao: conta.codigo_lancamento_integracao,
                    codigo_cliente_fornecedor: conta.codigo_cliente_fornecedor,
                    data_vencimento: conta.data_vencimento,
                    valor_documento: conta.valor_documento,
                    codigo_categoria: conta.codigo_categoria,
                    data_previsao: conta.data_previsao,
                    id_conta_corrente: conta.id_conta_corrente, 
                  }]);
                  

                console.log(` Enviando conta: ${conta.codigo_lancamento_integracao}`);
                const response = await axios.post(OMIE_URLS.CONTAS_PAGAR, payload, {
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
 
    
    /* CRIAR ARQUIVO LOG DE ENVIO
    salvarLog("log_contas", sucesso, erros); */
    return { resultados, sucesso, erros };

   
    } 



module.exports = { buscarCategoriasOmie, 
    buscarCodigoContaCorrente, 
    buscarClienteOmie,  
    enviarParaOmieNaoBaixadas,
    enviarParaOmieBaixadas
};
