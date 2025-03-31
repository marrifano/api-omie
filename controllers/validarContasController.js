const axios = require("axios");
const { formatarData } = require("../utilitarios/auxiliares");
const { buscarContasPagarRM, buscarContaRM } = require("../services/rmService");  
const { buscarCategoriasOmie, 
    buscarCodigoContaCorrente, 
    buscarClienteOmie,
    enviarParaOmieBaixadas,
    enviarParaOmieNaoBaixadas, buscarDepartamentosOmie, buscarContasPagarOmie } = require("../services/omieService");  

async function validarContasPorDia(req, res) {

    console.log("🔍 Iniciando validação de contas..."); 

    try {
        const dataVencimento = req.query.data; 
        if (!dataVencimento) {
            return res.status(400).json({ erro: "Informe a data no formato DD/MM/AAAA na URL. Exemplo: ?data=20/03/2025" });
        }

        console.log(`📅 Validando contas para o dia: ${dataVencimento}`);

        // 🔎 Buscar dados no RM e Omie
        const contasRM =    await buscarContasPagarRM(dataVencimento);
        const contasOmie =  await buscarContasPagarOmie(dataVencimento);  

            if (contasRM.length === 0 && contasOmie.length === 0) {
                return res.json({ mensagem: `Nenhuma conta encontrada no RM nem no Omie para ${dataVencimento}` });
            }
  
            function normalizarCodigo(codigo) {
                return String(codigo).trim(); 
            }
 
            function formatarParaDDMMYYYY(data) {
                if (!data) return null;  
            
                try { 
                    if (typeof data === "string" && data.includes("/")) return data;
    
                    const dateObj = new Date(data);
                    if (isNaN(dateObj)) throw new Error("Data inválida!");
    
                    const dia = String(dateObj.getUTCDate()).padStart(2, "0");
                    const mes = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
                    const ano = dateObj.getUTCFullYear();
            
                    return `${dia}/${mes}/${ano}`;
                } catch (error) {
                    console.error(`❌ Erro ao formatar data: ${data}`, error);
                    return null;
                }
            }

            // 🔍 Filtra apenas os campos necessários
            const rmLista = contasRM.map(conta =>  ({ 
                codigo_lancamento_integracao: normalizarCodigo(conta.codigo_lancamento_integracao),
                valor_documento: parseFloat(conta.valor_baixado), 
                data_vencimento: formatarParaDDMMYYYY(conta.data_vencimento),
            }));
 
            const omieLista = contasOmie.map(conta => ({
                codigo_lancamento_integracao: normalizarCodigo(conta.codigo_lancamento_integracao),
                codigo_lancamento_omie: conta.codigo_lancamento_omie,
                valor_documento: conta.valor_documento,  
                data_vencimento: conta.data_vencimento
            })); 

            const resultadoValidacao = [];
            const totalValorRM = rmLista.reduce((acc, conta) => acc + (conta.valor_documento || 0), 0);
            const totalValorOmie = omieLista.reduce((acc, conta) => acc + (conta.valor_documento || 0), 0);


        // 🔍 Percorre as contas do RM e verifica no Omie
        rmLista.forEach(contaRM => {
            const contaOmie = omieLista.find(conta => 
                conta.codigo_lancamento_integracao === contaRM.codigo_lancamento_integracao &&
                conta.data_vencimento === contaRM.data_vencimento
            );

            if (!contaOmie) {
                // ❌ Não encontrou no Omie
                resultadoValidacao.push({
                    codigo_lancamento_integracao: contaRM.codigo_lancamento_integracao,
                    status: "❌ NÃO EXISTE NO OMIE",
                    data_vencimento: contaRM.data_vencimento, 
                    valor_rm: contaRM.valor_documento,
                    valor_omie: "-",
                    diferenca: "-",
                    desconto: contaRM.desconto || "-"
                });
            } else { 
                const diferenca = contaOmie.valor_documento - contaRM.valor_documento;

                if (Math.abs(diferenca) > 0.01) {
                    resultadoValidacao.push({
                        codigo_lancamento_integracao: contaRM.codigo_lancamento_integracao,
                        codigo_lancamento_omie: contaOmie.codigo_lancamento_omie,
                        status: "🟡 VALOR DIFERENTE",
                        data_vencimento: contaRM.data_vencimento,
                        valor_rm: contaRM.valor_documento,
                        valor_omie: contaOmie.valor_documento,
                        diferenca: diferenca.toFixed(2),
                        desconto: contaRM.desconto || "-"
                    });
                } else {
                    resultadoValidacao.push({
                        codigo_lancamento_integracao: contaRM.codigo_lancamento_integracao,
                        codigo_lancamento_omie: contaOmie.codigo_lancamento_omie,
                        status: "✅ OK, EXISTE NO OMIE",
                        data_vencimento: contaRM.data_vencimento,
                        valor_rm: contaRM.valor_documento, 
                        valor_omie: contaOmie.valor_documento,
                        diferenca: "0.00",
                        desconto: contaRM.desconto || "-"
                    });
                }
            }
        });

        // 📌 Agora verifica se tem algo no Omie que **não está no RM**
        omieLista.forEach(contaOmie => {
            const existeNoRM = rmLista.some(contaRM => 
                contaRM.codigo_lancamento_integracao === contaOmie.codigo_lancamento_integracao &&
                contaRM.data_vencimento === contaOmie.data_vencimento
            );

            if (!existeNoRM) {
                resultadoValidacao.push({
                    codigo_lancamento_integracao: contaOmie.codigo_lancamento_integracao,
                    status: "⚠️ DIFERENTE NO OMIE",
                    data_vencimento: contaOmie.data_vencimento,
                    valor_rm: "-",
                    valor_omie: contaOmie.valor_documento,
                    diferenca: "-"
                });
            }
        });

        // 📊 Exibir os resultados no console
        console.log("📊 Resultado da validação:");
        const resultadoOrdenado = resultadoValidacao.sort((a, b) => b.valor_rm - a.valor_rm);
        const resultadoFiltrado = resultadoOrdenado.filter(conta => conta.status === "❌ NÃO EXISTE NO OMIE")
 
        
        console.table(resultadoOrdenado); 
        console.table(resultadoFiltrado);  
        
        console.log(`📊 TOTAL DE CONTAS NO OMIE: ${resultadoOrdenado.length}`);
        console.log(`📊 TOTAL RM (VALOR PAGO): ${totalValorRM.toFixed(2)}`);
        console.log(`📊 TOTAL OMIE (VALOR DO DOCUMENTO): ${totalValorOmie.toFixed(2)}`);
       /** */
        while (resultadoFiltrado.length > 0) {
            const conta = resultadoFiltrado[0];
             
            try {
              await enviarContaIndividual(conta.codigo_lancamento_integracao);
               
              resultadoFiltrado.shift();
           
              console.log(`📉 Contas restantes para envio: ${resultadoFiltrado.length}`);
              console.table(resultadoFiltrado); 
            } catch (error) {
              console.error(`❌ Falha ao enviar conta ${conta.codigo_lancamento_integracao}:`, error.message);
             
             
             resultadoFiltrado.push(resultadoFiltrado.shift());
            }
          }
          
          
        
        
       
    } catch (error) {
        console.error("❌ Erro ao validar contas por dia:", error);
        res.status(500).json({ erro: error.message });
    }
}

async function enviarContaIndividual(idLan) {
    const contas = await buscarContaRM(idLan);
    if (!contas || contas.length === 0) throw new Error("Conta não encontrada no RM");

    const categoriasOmie = await buscarCategoriasOmie();
    const departamentosOmie = await buscarDepartamentosOmie();
    const codigoPadrao = "2.02.99";

    const conta = contas[0];

    conta.codigo_cliente_fornecedor = await buscarClienteOmie(conta.codigo_cliente_fornecedor);
    conta.id_conta_corrente = await buscarCodigoContaCorrente(conta.id_conta_corrente);

    // Categoria
    const nomesAcionistas = ['AC1', 'AC2', 'AC3', 'AC4', 'AC5', 'AC6'];
    const codigoAcionistas = "2.02.04";

    if (nomesAcionistas.some(dep => conta.departamento?.startsWith(dep))) {
        conta.codigo_categoria = codigoAcionistas;
    } else {
        const categoriasFiltradas = categoriasOmie.filter(cat => cat.descricao === conta.codigo_categoria);
        if (categoriasFiltradas.length > 1) {
            const subcategoria = categoriasFiltradas.reduce((maisEspecifica, categoriaAtual) =>
                categoriaAtual.codigo.length > maisEspecifica.codigo.length ? categoriaAtual : maisEspecifica
            );
            conta.codigo_categoria = subcategoria.codigo;
        } else if (categoriasFiltradas.length === 1) {
            conta.codigo_categoria = categoriasFiltradas[0].codigo;
        } else {
            conta.codigo_categoria = codigoPadrao;
        }
    }

    // Formata datas
    conta.data_vencimento = formatarData(conta.data_vencimento);
    conta.data_previsao = formatarData(conta.data_previsao);
    conta.data_baixa = formatarData(conta.data_baixa);

    // Departamento
    const departamentoEncontrado = departamentosOmie.find(dep => dep.descricao === conta.departamento);
    conta.codigo_departamento = departamentoEncontrado ? departamentoEncontrado.codigo : null;

    conta.distribuicao = conta.codigo_departamento ? [{
        cCodDep: conta.codigo_departamento,
        cDesDep: conta.departamento,
        nValDep: conta.valor_documento,
        nPerDep: 100.00
    }] : [];

    // Envia
    console.log(conta.statuslan, "STATUS ")
    return conta.statuslan == 1
        ? await enviarParaOmieBaixadas([conta])
        : await enviarParaOmieNaoBaixadas([conta]);
}

async function validarContasPorMes(req, res) {
    console.log("🔍 Iniciando validação de contas mês completo...");
  
    const dataBase = req.query.data;
    if (!dataBase) {
      return res.status(400).json({ erro: "Informe a data no formato DD/MM/AAAA. Ex: ?data=01/03/2025" });
    }
  
    const [dia, mes, ano] = dataBase.split("/").map(Number);
    const ultimoDia = new Date(ano, mes, 0).getDate(); // pega último dia do mês informado
  
    const todasValidacoes = [];
  
    for (let diaAtual = 1; diaAtual <= ultimoDia; diaAtual++) {
      const dataVencimento = `${String(diaAtual).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
      console.log(`\n📅 Validando contas para o dia: ${dataVencimento}`);
  
      const contasRM = await buscarContasPagarRM(dataVencimento);
      const contasOmie = await buscarContasPagarOmie(dataVencimento);
  
      if (contasRM.length === 0 && contasOmie.length === 0) {
        console.log(`⛔ Nenhuma conta no RM nem no Omie para ${dataVencimento}`);
        continue;
      }
  
      const rmLista = contasRM.map(conta => ({
        codigo_lancamento_integracao: String(conta.codigo_lancamento_integracao).trim(),
        valor_documento: parseFloat(conta.valor_baixado),
        data_vencimento: dataVencimento,
      }));
  
      const omieLista = contasOmie.map(conta => ({
        codigo_lancamento_integracao: String(conta.codigo_lancamento_integracao).trim(),
        codigo_lancamento_omie: conta.codigo_lancamento_omie,
        valor_documento: conta.valor_documento,
        data_vencimento: conta.data_vencimento,
      }));
  
      const resultadoValidacao = [];
  
      rmLista.forEach(contaRM => {
        const contaOmie = omieLista.find(conta =>
          conta.codigo_lancamento_integracao === contaRM.codigo_lancamento_integracao &&
          conta.data_vencimento === contaRM.data_vencimento
        );
  
        if (!contaOmie) {
          resultadoValidacao.push({
            codigo_lancamento_integracao: contaRM.codigo_lancamento_integracao,
            status: "❌ NÃO EXISTE NO OMIE",
            data_vencimento: contaRM.data_vencimento,
            valor_rm: contaRM.valor_documento,
            valor_omie: "-",
            diferenca: "-",
          });
        } else {
          const diferenca = contaOmie.valor_documento - contaRM.valor_documento;
          if (Math.abs(diferenca) > 0.01) {
            resultadoValidacao.push({
              codigo_lancamento_integracao: contaRM.codigo_lancamento_integracao,
              status: "🟡 VALOR DIFERENTE",
              valor_rm: contaRM.valor_documento,
              valor_omie: contaOmie.valor_documento,
              diferenca: diferenca.toFixed(2),
              data_vencimento: contaRM.data_vencimento,
            });
          } else {
            resultadoValidacao.push({
              codigo_lancamento_integracao: contaRM.codigo_lancamento_integracao,
              status: "✅ OK",
              valor_rm: contaRM.valor_documento,
              valor_omie: contaOmie.valor_documento,
              diferenca: "0.00",
              data_vencimento: contaRM.data_vencimento,
            });
          }
        }
      });
  
      // Procura contas que estão só no Omie
      omieLista.forEach(contaOmie => {
        const existeNoRM = rmLista.some(contaRM =>
          contaRM.codigo_lancamento_integracao === contaOmie.codigo_lancamento_integracao &&
          contaRM.data_vencimento === contaOmie.data_vencimento
        );
  
        if (!existeNoRM) {
          resultadoValidacao.push({
            codigo_lancamento_integracao: contaOmie.codigo_lancamento_integracao,
            status: "⚠️ DIFERENTE NO OMIE",
            valor_rm: "-",
            valor_omie: contaOmie.valor_documento,
            diferenca: "-",
            data_vencimento: contaOmie.data_vencimento,
          });
        }
      });
  
      const contasParaEnviar = resultadoValidacao.filter(c => c.status === "❌ NÃO EXISTE NO OMIE");
  
      for (const conta of contasParaEnviar) {
        try {
          await enviarContaIndividual(conta.codigo_lancamento_integracao);
          console.log(`✅ Enviada: ${conta.codigo_lancamento_integracao}`);
        } catch (error) {
          console.error(`❌ Falha ao enviar ${conta.codigo_lancamento_integracao}: ${error.message}`);
        }
      }
  
      todasValidacoes.push(...resultadoValidacao);
    }
  
    console.log(`\n✅ Validação do mês concluída! Total de contas validadas: ${todasValidacoes.length}`);
    return res.json({ validacoes: todasValidacoes });
  }
  
  
module.exports = { validarContasPorDia, validarContasPorMes };
