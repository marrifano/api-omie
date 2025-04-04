function formatarContaOmie(conta) {
    return {
      codigo_lancamento_integracao: String(conta.codigo_lancamento_integracao).trim(),
      codigo_lancamento_omie: conta.codigo_lancamento_omie,
      valor_documento: conta.valor_documento,
      data_vencimento: conta.data_vencimento
    };
  }
  
  module.exports = { formatarContaOmie };
  