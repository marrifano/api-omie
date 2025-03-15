const axios = require("axios");
const https = require("https"); 
const { esperar, formatarData, aguardarEnter } = require("../utilitarios/auxiliares");
const { gerarPayload } = require("../utilitarios/payloads");
const { salvarLog } = require("../utilitarios/logService");

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


            const payload = gerarPayload("UpsertContaPagar", {
                codigo_lancamento_integracao: conta.codigo_lancamento_integracao,
                codigo_cliente_fornecedor: conta.codigo_cliente_fornecedor,
                data_vencimento: formatarData(conta.data_vencimento),
                valor_documento: conta.valor_documento, 
                codigo_categoria: conta.codigo_categoria, 
                data_previsao: formatarData(conta.data_previsao),
                id_conta_corrente: conta.CONTAS_CORRENTES
            });

            console.log(` Enviando conta: ${conta.codigo_lancamento_integracao}`);
            const response = await axios.post(OMIE_URL, payload, {
                headers: headers,
                httpsAgent: agent,
            });


            
            await aguardarEnter();
            console.log(`✅ Conta "${conta.codigo_lancamento_integracao}" enviada com sucesso!`);
            sucesso.push(conta);
            resultados.push(response.data);
        } catch (error) {
            const mensagemErro = `Erro ao enviar conta ${conta.codigo_lancamento_integracao}: ${error.response?.data?.faultstring || error.message}`;
            console.error(`❌ ${mensagemErro}`);
            erros.push({ conta, erro: mensagemErro });
        }
    }

    // Criar log de envio
    salvarLog("log_contas", sucesso, erros);
    return resultados;
  }

  async function lancarPagamentosOmie(conta) {
    try {
      const payload = gerarPayload("LancarPagamento", {
        codigo_lancamento_integracao: conta.codigo_lancamento_integracao,
        codigo_baixa_integracao: conta.codigo_baixa_integracao,
        codigo_conta_corrente: conta.id_conta_corrente,
        valor: conta.valor_baixado,
        desconto: conta.desconto,
        juros: conta.juros,
        multa: conta.multa,
        data: formatarData(conta.data_baixa),
        observacao: conta.observacao || "Baixa de documento realiza6da via API."
      });
  
      console.log(`💰 Lançando pagamento para conta ${conta.codigo_lancamento_integracao}`);

      await aguardarEnter();  
      const response = await axios.post(OMIE_URLS.CONTAS_PAGAR, payload);
      console.log(`✅ Pagamento da conta ${conta.codigo_lancamento_integracao} lançado com sucesso!`);
      return response;
    } catch (error) {
      console.error(`❌ Erro ao lançar pagamento no Omie para a conta ${conta.codigo_lancamento_integracao}:`, error);
    }
  }


module.exports = { buscarCategoriasOmie, buscarCodigoContaCorrente, buscarClienteOmie, enviarParaOmie, lancarPagamentosOmie };
