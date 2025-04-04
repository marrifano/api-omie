const { buscarContasPagarRM, buscarContasPagarOmie } = require("../services/rmService");
const { enviarContaIndividual } = require("../controllers/validarContasController");
 
const { formatarContaRM } = require("../utilitarios/formatarContaRm");
const { formatarContaOmie } = require("../utilitarios/formatarContaOmie");
const { compararContasRMxOmie } = require("../utilitarios/compararContas");

async function validarContasPorData(dataVencimento) {
  const contasRM = await buscarContasPagarRM(dataVencimento);
  const contasOmie = await buscarContasPagarOmie(dataVencimento);

  if (contasRM.length === 0 && contasOmie.length === 0) {
    console.log(`⛔ Nenhuma conta no RM nem no Omie para ${dataVencimento}`);
    return [];
  }

  const rmLista = contasRM.map(c => formatarContaRM(c, dataVencimento));
  const omieLista = contasOmie.map(formatarContaOmie);

  const resultado = compararContasRMxOmie(rmLista, omieLista);

  const contasParaEnviar = resultado.filter(c => c.status === "❌ NÃO EXISTE NO OMIE");

  for (const conta of contasParaEnviar) {
    try {
      await enviarContaIndividual(conta.codigo_lancamento_integracao, conta.data_vencimento);
      console.log(`✅ Enviada: ${conta.codigo_lancamento_integracao}`);
    } catch (error) {
      console.error(`❌ Falha ao enviar ${conta.codigo_lancamento_integracao}: ${error.message}`);
    }
  }

  return resultado;
}

module.exports = { validarContasPorData };
