// utils/compararContasRMxOmie.js

function compararContasRMxOmie(rmLista, omieLista) {
    const resultado = [];
  
    // 🔁 Verifica se cada conta do RM existe no Omie
    rmLista.forEach(rm => {
      const omie = omieLista.find(o =>
        o.codigo_lancamento_integracao === rm.codigo_lancamento_integracao &&
        o.data_vencimento === rm.data_vencimento
      );
  
      if (!omie) {
        resultado.push({
          codigo_lancamento_integracao: rm.codigo_lancamento_integracao,
          status: "❌ NÃO EXISTE NO OMIE",
          data_vencimento: rm.data_vencimento,
          valor_rm: rm.valor_documento,
          valor_omie: "-",
          diferenca: "-",
          coligada: rm.coligada || 0
        });
      } else {
        const diferenca = omie.valor_documento - rm.valor_documento;
        const diferencaFormatada = diferenca.toFixed(2);
  
        resultado.push({
          codigo_lancamento_integracao: rm.codigo_lancamento_integracao,
          codigo_lancamento_omie: omie.codigo_lancamento_omie,
          status: Math.abs(diferenca) > 0.01 ? "🟡 VALOR DIFERENTE" : "✅ OK, EXISTE NO OMIE",
          data_vencimento: rm.data_vencimento,
          valor_rm: rm.valor_documento,
          valor_omie: omie.valor_documento,
          diferenca: diferencaFormatada,
          coligada: rm.coligada || 0
        });
      }
    });
  
    // ⚠️ Verifica se tem alguma conta no Omie que não está no RM
    omieLista.forEach(omie => {
      const existeNoRM = rmLista.some(rm =>
        rm.codigo_lancamento_integracao === omie.codigo_lancamento_integracao &&
        rm.data_vencimento === omie.data_vencimento
      );
  
      if (!existeNoRM) {
        resultado.push({
          codigo_lancamento_integracao: omie.codigo_lancamento_integracao,
          status: "⚠️ DIFERENTE NO OMIE",
          data_vencimento: omie.data_vencimento,
          valor_rm: "-",
          valor_omie: omie.valor_documento,
          diferenca: "-",
          coligada: 0
        });
      }
    });
  
    return resultado;
  }
  
  module.exports = { compararContasRMxOmie };
  