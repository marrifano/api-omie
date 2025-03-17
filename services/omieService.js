const axios = require("axios");
const https = require("https");  

const { buscarDadosClienteRM } = require("../services/rmService");  
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
 /*
    async function buscarClienteOmie(codigoClienteRM) {
        try {
            await esperar(700);
    
            const payloadConsulta = gerarPayload("ConsultarCliente", [{ 
                "codigo_cliente_integracao": codigoClienteRM 
            }]);
    
            console.log(`🔍 Buscando cliente no Omie: ${codigoClienteRM}`);
    
            let responseConsulta;
            try {
                responseConsulta = await axios.post(OMIE_URLS.CLIENTES, payloadConsulta, { headers, httpsAgent: agent });
    
                if (responseConsulta.data && responseConsulta.data.codigo_cliente_omie) {
                    console.log('✅ Cliente encontrado no Omie:', responseConsulta.data.codigo_cliente_omie);   
                    return responseConsulta.data.codigo_cliente_omie;
                }
            } catch (error) {
                console.warn(`⚠️ Cliente não encontrado no Omie: ${codigoClienteRM}. Buscando no RM...`);
            }
    
            // Se chegou aqui, significa que o cliente não foi encontrado no Omie
            const dadosClienteRM = await buscarDadosClienteRM(codigoClienteRM);
            
            if (!dadosClienteRM) {
                console.error(`❌ Cliente não encontrado no RM: ${codigoClienteRM}`);
                return null;
            }
    
            console.log("📄 Dados do cliente RM: ", dadosClienteRM);
    
            // Payload de criação no Omie
            const payloadCriarCliente = gerarPayload("UpsertCliente", [{
                codigo_cliente_integracao: dadosClienteRM.codigo_integracao,
                razao_social: dadosClienteRM.razao_social,
                nome_fantasia: dadosClienteRM.nome_fantasia,
                cnpj_cpf: dadosClienteRM.cnpj_cpf,
                endereco: dadosClienteRM.endereco,
                endereco_numero: dadosClienteRM.numero,
                bairro: dadosClienteRM.bairro,
                complemento: dadosClienteRM.complemento,
                estado: dadosClienteRM.estado,
                cidade: dadosClienteRM.cidade,
                cep: dadosClienteRM.cep,
                contato: dadosClienteRM.contato,
                email: dadosClienteRM.email, 
                inscricao_estadual: dadosClienteRM.inscricao_estadual,
                inscricao_municipal: dadosClienteRM.inscricao_municipal, 
            }]);
    
            console.log("🚀 Criando cliente no Omie...");
            const responseCriacao = await axios.post(OMIE_URLS.CLIENTES, payloadCriarCliente, { headers, httpsAgent: agent });
    
            if(responseCriacao.data && responseCriacao.data.codigo_cliente_omie){
                console.log('✅ Cliente criado com sucesso no Omie:', responseCriacao.data.codigo_cliente_omie);
                return responseCriacao.data.codigo_cliente_omie;
            } else {
                console.error('❌ Erro ao criar cliente no Omie:', responseCriacao.data);
                return null;
            }
    
        } catch (error) {
            console.error(`❌ Erro geral na busca/criação do cliente ${codigoClienteRM}:`, error.response?.data || error.message);
            return null;
        }
    }
 */ 
    async function buscarClienteOmie(codigoClienteRM) {
        try {
            await esperar(1000);
    
            const payloadConsulta = gerarPayload("ConsultarCliente", [{ 
                "codigo_cliente_integracao": codigoClienteRM 
            }]);
    
            console.log(`🔍 Buscando cliente no Omie: ${codigoClienteRM}`);
    
            let responseConsulta;
            try {
                await esperar(1000);
                responseConsulta = await axios.post(OMIE_URLS.CLIENTES, payloadConsulta, { headers, httpsAgent: agent });
    
                if (responseConsulta.data && responseConsulta.data.codigo_cliente_omie) {
                    console.log('✅ Cliente encontrado no Omie:', responseConsulta.data.codigo_cliente_omie);   
                    return responseConsulta.data.codigo_cliente_omie;
                }
            } catch (error) {
                console.warn(`⚠️ Cliente não encontrado no Omie: ${codigoClienteRM}. Buscando no RM...`);
            }
    
            // Se chegou aqui, significa que o cliente não foi encontrado no Omie
            const dadosClienteRM = await buscarDadosClienteRM(codigoClienteRM); 
            if (!dadosClienteRM) {
                console.error(`❌ Cliente não encontrado no RM: ${codigoClienteRM}`);
                return null;
            }
    
            console.log("📄 Dados do cliente RM: ", dadosClienteRM);
    
            await esperar(1000);
            // Payload de criação no Omie
            const payloadCriarCliente = gerarPayload("IncluirCliente", [{
                codigo_cliente_integracao: dadosClienteRM.codigo_integracao,
                razao_social: dadosClienteRM.razao_social,
                nome_fantasia: dadosClienteRM.nome_fantasia,
                cnpj_cpf: dadosClienteRM.cnpj_cpf,
                endereco: dadosClienteRM.endereco,
                endereco_numero: dadosClienteRM.numero,
                bairro: dadosClienteRM.bairro,
                complemento: dadosClienteRM.complemento,
                estado: dadosClienteRM.estado, 
                cep: dadosClienteRM.cep,
                contato: dadosClienteRM.contato,
                email: dadosClienteRM.email, 
                inscricao_estadual: dadosClienteRM.inscricao_estadual,
                inscricao_municipal: dadosClienteRM.inscricao_municipal, 
            }]);
    
            console.log("🚀 Criando cliente no Omie...");
            try {
                await esperar(1000);
                const responseCriacao = await axios.post(OMIE_URLS.CLIENTES, payloadCriarCliente, { headers, httpsAgent: agent });
    
                if(responseCriacao.data && responseCriacao.data.codigo_cliente_omie){
                    console.log('✅ Cliente criado com sucesso no Omie:', responseCriacao.data.codigo_cliente_omie);
                    return responseCriacao.data.codigo_cliente_omie;
                } 
            } catch (error) {
                const mensagemErro = error.response?.data?.faultstring || error.message;
                await esperar(700);
                console.error(`❌ Erro ao criar cliente no Omie:`, mensagemErro);
    
                // 🚀 Se o erro for que o cliente já existe, pega o código correto e usa ele
                const regex = /código de integração \[(.*?)\]/;
                const match = mensagemErro.match(regex);
    
                if (match && match[1]) {
                    console.log(`🔗 Cliente já cadastrado no Omie! Usando código existente: ${match[1]}`);
 
                    console.log(`🔍 Buscando cliente no Omie novamente com código correto: ${match[1]}`);
                    const payloadNovaConsulta = gerarPayload("ConsultarCliente", [{ 
                        "codigo_cliente_integracao": match[1] 
                    }]);

                    try {
                        await esperar(700);
                        const responseNovaConsulta = await axios.post(OMIE_URLS.CLIENTES, payloadNovaConsulta, { headers, httpsAgent: agent });

                        if (responseNovaConsulta.data && responseNovaConsulta.data.codigo_cliente_omie) {
                            console.log('✅ Cliente encontrado na nova consulta:', responseNovaConsulta.data.codigo_cliente_omie);
                            return responseNovaConsulta.data.codigo_cliente_omie;
                        }
                    } catch (error) {
                        console.error(`❌ Erro ao buscar cliente na nova consulta no Omie:`, error.response?.data || error.message);
                        return null;
                    }
                }
    
                return null;
            }
    
        } catch (error) {
            console.error(`❌ Erro geral na busca/criação do cliente ${codigoClienteRM}:`, error.response?.data || error.message);
            return null;
        }
    }
    
    async function enviarParaOmieBaixadas(contas) { 
        const resultados = [];
        const sucesso = [];
        const erros = [];

        console.log("\n \n🔍 CONTAS BAIXADAS A SEREM ENVIADAS: "); 

        for (const conta of contas) {
            try {
                await esperar(1000);  
                // await aguardarEnter();
 
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
                    timeout: 10000
                });

                console.log(`✅ CONTA: "${conta.codigo_lancamento_integracao}" enviada com sucesso!`);
  
                const payloadPagamento = gerarPayload("LancarPagamento", [{
                    codigo_lancamento_integracao: conta.codigo_lancamento_integracao,
                    data: conta.data_baixa,
                    valor: conta.valor_baixado,
                    desconto: conta.desconto,
                    juros: conta.juros,
                    multa: conta.multa,
                    codigo_conta_corrente: conta.id_conta_corrente,
                    observacao: conta.observacao || "Pagamento lançado via integração"
                }]);

                const responsePagamento = await axios.post(OMIE_URLS.CONTAS_PAGAR, payloadPagamento, {
                    headers,
                    httpsAgent: agent,
                    timeout: 10000
                });

                console.log(`💰 Pagamento para conta "${conta.codigo_lancamento_integracao}" enviado com sucesso!`);

                sucesso.push({
                    conta: responsePagamento.data,
                    pagamento: responsePagamento.data
                });
                resultados.push({
                    conta: responsePagamento.data,
                    pagamento: responsePagamento.data
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

        console.log("\n \n🔍 CONTAS EM ABERTO A SEREM ENVIADAS: "); 

        for (const conta of contas) {
            try {
                await esperar(1000);  
                // await aguardarEnter();

                const payload = gerarPayload("UpsertContaPagar", [{
                    codigo_lancamento_integracao: conta.codigo_lancamento_integracao,
                    codigo_cliente_fornecedor: conta.codigo_cliente_fornecedor,
                    data_vencimento: conta.data_vencimento,
                    valor_documento: conta.valor_documento,
                    codigo_categoria: conta.codigo_categoria,
                    data_previsao: conta.data_previsao,
                    id_conta_corrente: conta.id_conta_corrente, 
                    numero_documento:conta.codigo_lancamento_integracao,
                  }]);
                  

                console.log(` Enviando conta: ${conta.codigo_lancamento_integracao} ...`);
                const response = await axios.post(OMIE_URLS.CONTAS_PAGAR, payload, {
                    headers: headers,
                    httpsAgent: agent,
                    timeout: 10000
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
