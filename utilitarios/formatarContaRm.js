function formatarContaRM(conta, dataVencimentoFixa = null) {
    const formatarParaDDMMYYYY = (data) => {
      if (!data) return null;
  
      try {
        if (typeof data === "string" && data.includes("/")) return data;
  
        const dateObj = new Date(data);
        if (isNaN(dateObj)) throw new Error("Data inválida");
  
        const dia = String(dateObj.getUTCDate()).padStart(2, "0");
        const mes = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        const ano = dateObj.getUTCFullYear();
  
        return `${dia}/${mes}/${ano}`;
      } catch (err) {
        console.error(`❌ Erro ao formatar data do RM: ${data}`, err);
        return null;
      }
    };
  
    return {
      codigo_lancamento_integracao: String(conta.codigo_lancamento_integracao).trim(),
      valor_documento: parseFloat(conta.valor_baixado),
      data_vencimento: dataVencimentoFixa || formatarParaDDMMYYYY(conta.data_vencimento),
      desconto: conta.desconto || 0,
      coligada: conta.coligada || 0
    };
  }
  
  module.exports = { formatarContaRM };
  