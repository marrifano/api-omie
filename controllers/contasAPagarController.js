
const axios = require("axios");
const https = require("https");  
const { formatarData, aguardarEnter } = require("../utilitarios/auxiliares");
const { salvarLog } = require("../utilitarios/logService");
const { gerarPayload } = require("../utilitarios/payloads"); 
const { buscarContasPagarRM, buscarContaRM } = require("../services/rmService");  
const { buscarCategoriasOmie, 
    buscarCodigoContaCorrente, 
    buscarClienteOmie,
    enviarParaOmieBaixadas,
    enviarParaOmieNaoBaixadas, buscarDepartamentosOmie  } = require("../services/omieService");  

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
            
            console.log("🔄 Carregando os dados necessários...");
            
            const contasRM = await buscarContasPagarRM(dataDeVencimento);  
            const categoriasOmie = await buscarCategoriasOmie();  
            const departamentosOmie = await buscarDepartamentosOmie(); 
            const codigoPadrao = "2.02.99";   
             
 
            const contasBaixadas = [];
            const contasNaoBaixadas = [];
            
            const logsBaixadas = { sucesso: [], erros: [] };
            const logsNaoBaixadas = { sucesso: [], erros: [] };


            for (let conta of contasRM) {   
                conta.codigo_cliente_fornecedor = await buscarClienteOmie(conta.codigo_cliente_fornecedor); //ACHAR CLIENTE.
                console.log("📌 Codigo do cliente utilizado:", conta.codigo_cliente_fornecedor)  
                const codigoConta = await buscarCodigoContaCorrente(conta.id_conta_corrente); //ACHAR CONTA CORRENTE.
        
                if (codigoConta) {
                    console.log(`Substituindo id, da conta corrente ${conta.id_conta_corrente}  por: ${codigoConta}`)
                    conta.id_conta_corrente = codigoConta;
                }   

                //ACHA A CATEGORIA  
                const nomesAcionistas = ['AC1', 'AC2', 'AC3', 'AC4', 'AC5', 'AC6'];
                const codigoAcionistas = "2.02.04";
   
                // Verifica o departamento é de acionistas, se for, joga tudo para a natureza/categoria acionista
                if (nomesAcionistas.some(dep => conta.departamento.startsWith(dep))) {
                  conta.codigo_categoria = codigoAcionistas;
                 } else { 
                  const categoriasFiltradas = categoriasOmie.filter(cat => cat.descricao === conta.codigo_categoria);
  
                  // Verifica se a categoria é cabeça, se for, joga para a subcategoria com o mesmo nome. 
                if (categoriasFiltradas.length > 1) {
                    const subcategoria = categoriasFiltradas.reduce((maisEspecifica, categoriaAtual) =>
                      categoriaAtual.codigo.length > maisEspecifica.codigo.length ? categoriaAtual : maisEspecifica
                    );

                    conta.codigo_categoria = subcategoria.codigo;

                  } else if (categoriasFiltradas.length === 1) {
                    conta.codigo_categoria = categoriasFiltradas[0].codigo;

                  } else {
                    console.warn(`⚠️ Categoria não encontrada para ${conta.codigo_categoria}, usando código padrão.`);
                    conta.codigo_categoria = codigoPadrao;
                  }
                }

                console.log('✅ Código da categoria final: ', conta.codigo_categoria);


                //FORMATA DATAS
                conta.data_vencimento = formatarData(conta.data_vencimento)  
                conta.data_previsao = formatarData(conta.data_previsao)
                conta.data_baixa = formatarData(conta.data_baixa)

                //ACHAR DEPARTAMENTO 
                const departamentoEncontrado = departamentosOmie.find(dep => dep.descricao === conta.departamento);
                conta.codigo_departamento = departamentoEncontrado ? departamentoEncontrado.codigo : null; 
                
                 
                conta.distribuicao = conta.departamento ? [{
                    cCodDep: conta.codigo_departamento,
                    cDesDep: conta.departamento,
                    nValDep: conta.valor_documento,
                    nPerDep: 100.00  
                }] : [];
 

                const resultadoEnvio = conta.statuslan == 1
                ? await enviarParaOmieBaixadas([conta])
                : await enviarParaOmieNaoBaixadas([conta]);
    
                const log = conta.statuslan == 1 ? logsBaixadas : logsNaoBaixadas;
                log.sucesso.push({ id: conta.codigo_lancamento_integracao, retorno: resultadoEnvio });
        
                console.log(`✅ Conta enviada: ${conta.codigo_lancamento_integracao}`);

/*
                 
                // SEPARA CONTAS BAIXADAS DAS NÃO BAIXADAS 
                if (conta.statuslan == 1) {
                    console.log("✅ Conta paga identificada. ");
                    contasBaixadas.push(conta);
                } else {
                    console.log("⚠️ Conta não paga identificada.");
                    contasNaoBaixadas.push(conta);
                }
                     */
            }   
  
 
       // const resultados = await enviarParaOmie(contasFormatadas);  
    } catch (erro) {
        const log = conta.statuslan == 1 ? logsBaixadas : logsNaoBaixadas;
        log.erros.push({ id: conta.codigo_lancamento_integracao, erro: erro.message });
        console.error(`   ❌ Erro ao enviar conta ${conta.codigo_lancamento_integracao}:`, erro.message);
      }

      salvarLog("log_contas_nao_baixadas", logsNaoBaixadas.sucesso, logsNaoBaixadas.erros);
      salvarLog("log_contas_baixadas", logsBaixadas.sucesso, logsBaixadas.erros);

      res.json({
          mensagem: "Contas enviadas direto após conversão!",
          baixadas: logsBaixadas,
          nao_baixadas: logsNaoBaixadas
      });

    } 
 
    async function enviarContaIndividual(req, res) {  
        try {
          const idlan = req.query.idlan;  
          const contas = await buscarContaRM(idlan); 
          if (!contas || contas.length === 0) {
            return res.status(404).json({ erro: "Conta não encontrada no RM" });
          }
      
            const conta = contas[0];
      
          // Enriquecer a conta com dados do Omie
          conta.codigo_cliente_fornecedor = await buscarClienteOmie(conta.codigo_cliente_fornecedor);
          conta.id_conta_corrente = await buscarCodigoContaCorrente(conta.id_conta_corrente);
      
          const categoriasOmie = await buscarCategoriasOmie();
          const categoria = categoriasOmie.find(cat => cat.descricao === conta.codigo_categoria);
          conta.codigo_categoria = categoria?.codigo || "2.02.99";
      
          const departamentosOmie = await buscarDepartamentosOmie();
          const dep = departamentosOmie.find(d => d.descricao === conta.departamento);
          conta.codigo_departamento = dep?.codigo;

          
            //FORMATA DATAS
            conta.data_vencimento = formatarData(conta.data_vencimento)  
            conta.data_previsao = formatarData(conta.data_previsao)
            conta.data_baixa = formatarData(conta.data_baixa)

      
          conta.distribuicao = dep ? [{
            cCodDep: conta.codigo_departamento,
            cDesDep: conta.departamento,
            nValDep: conta.valor_documento,
            nPerDep: 100.00
          }] : [];
           
      
          const enviado = conta.statuslan == 1
            ? await enviarParaOmieBaixadas([conta])
            : await enviarParaOmieNaoBaixadas([conta]);
      
          res.json({ mensagem: "Envio Concluido! ", resultado: enviado,   });
          console.log( )
        } catch (error) {
          console.error("❌ Erro ao enviar conta individual:", error);
          res.status(500).json({ erro: "Erro ao enviar conta" });
        }
      } 
      
module.exports = { listarContasAPagar, incluirContaPagar,   enviarContaIndividual  };
