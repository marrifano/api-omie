const { buscarContasPagarRM } = require("./rmService");
const { salvarLog } = require("../utilitarios/logService");
const { formatarData } = require("../utilitarios/auxiliares");
const { aguardarEnter } = require("../utilitarios/readlineHelper");
const omie = require("./omieService");

async function listarContasAPagarOmie() {
  const payload = omie.gerarPayload("ListarContasPagar", [
    { pagina: 1, registros_por_pagina: 500, apenas_importado_api: "N" },
  ]);
  const data = await omie.postOmie(omie.OMIE_URLS.CONTAS_PAGAR, payload);
  return data;
} 

async function incluirContasPagarNoOmie() {
  const categoriasOmie = await carregarCategoriasOmie();
  const contasRM = await buscarContasPagarRM();
 
  const codigoPadrao = "0.01.98";

  const contasFormatadas = await Promise.all(
    contasRM.map(async (conta) => {
      conta.codigo_cliente_fornecedor = (await buscarClienteOmie(conta.codigo_cliente_fornecedor));

        console.log("codigo cliente: ", conta.codigo_cliente_fornecedor)

        if (!codigoClienteFornecedor) {
          const dadosFornecedor = await buscarDadosFornecedorRM(conta.codigo_cliente_fornecedor);
          codigoClienteFornecedor = await criarClienteFornecedorOmie(dadosFornecedor);
        }


      conta.codigo_cliente_fornecedor = codigoClienteFornecedor;
        
      aguardarEnter()
 
      console.log("codigo cliente: ", conta.codigo_cliente_fornecedor)


      const codigoContaCorrente = await buscarCodigoContaCorrente(conta.id_conta_corrente);
      conta.id_conta_corrente = codigoContaCorrente || conta.id_conta_corrente;

      const categoriaEncontrada = categoriasOmie.find(
        (cat) => cat.descricao === conta.codigo_categoria
      );
      conta.codigo_categoria = categoriaEncontrada ? categoriaEncontrada.codigo : codigoPadrao;

      return {
        ...conta,
        data_vencimento: formatarData(conta.data_vencimento),
        data_previsao: formatarData(conta.data_previsao),
      };
    })
  );

  console.log("📦 Contas formatadas antes do envio:", contasFormatadas);

  const resultados = [];

  for (const conta of contasFormatadas) {
    await aguardarEnter();
    const payload = omie.gerarPayload("UpsertContaPagar", [conta]);
    try {
      const resultado = await omie.postOmie(omie.OMIE_URLS.CONTAS_PAGAR, payload);
      console.log(`✅ Conta ${conta.codigo_lancamento_integracao} enviada com sucesso!`);
      resultados.push(resultado);
    } catch (error) {
      console.error(`❌ Erro ao enviar conta ${conta.codigo_lancamento_integracao}:`, error);
    }
  }

  salvarLog("log_contas", resultados);
  return resultados;
}

  async function carregarCategoriasOmie() {
    const payload = omie.gerarPayload("ListarCategorias", [{ pagina: 1, registros_por_pagina: 100 }]);
    const data = await omie.postOmie(omie.OMIE_URLS.CATEGORIAS, payload);
    return data.categoria_cadastro || [];
  }

  async function buscarClienteOmie(codigoClienteRM) {
    const payload = omie.gerarPayload("ConsultarCliente", [
      { codigo_cliente_integracao: codigoClienteRM },
    ]);
    const data = await omie.postOmie(omie.OMIE_URLS.CLIENTES, payload);
    return data.codigo_cliente_omie || null;
  }

  async function buscarCodigoContaCorrente(codigoInterno) {
    const payload = omie.gerarPayload("ListarContasCorrentes", [{ pagina: 1, registros_por_pagina: 500 }]);
    const data = await omie.postOmie(omie.OMIE_URLS.CONTAS_CORRENTES, payload);
    const conta = data.ListarContasCorrentes.find((c) => c.cCodCCInt === codigoInterno);
    return conta ? conta.nCodCC : null;
  }

  async function buscarDadosFornecedorRM(codigoFornecedor) {
    const query = `
      SELECT DISTINCT E.CODCFO, E.NOME AS RAZAO, E.CGCCFO AS CNPJCPF, E.NOMEFANTASIA, 
            E.EMAIL
      FROM FCFO E
      WHERE E.CODCFO = '${codigoFornecedor}'
    `;
    const resultado = await executarQuery(query);
    return resultado[0] || null;
  }

  async function criarClienteFornecedorOmie(dadosFornecedor) {
    if (!dadosFornecedor) return null;

    const payload = omie.gerarPayload("IncluirCliente", [{
      codigo_cliente_integracao: dadosFornecedor.CODCFO,
      email: dadosFornecedor.EMAIL  ,
      razao_social: dadosFornecedor.RAZAO ,
      nome_fantasia: dadosFornecedor.NOMEFANTASIA 
    }]);
    
    const data = await omie.postOmie(omie.OMIE_URLS.CLIENTES, payload);
    return data.codigo_cliente_omie || null;
  }

module.exports = { listarContasAPagarOmie, incluirContasPagarNoOmie };
