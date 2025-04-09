const cron = require("node-cron");
const moment = require("moment");

const { buscarLancamentosDoDia } = require("./services/rmService");
const { formatarData } = require("./utilitarios/auxiliares");
const { enviarContaIndividual } = require("./controllers/validarContasController");
const { buscarTodasContasOmie } = require("./services/omieService");

    let cacheOmie = [];
    let ultimosIdLancamentos = new Set();

    async function verificarNovasContas() {
    try {
        const hoje = moment().format("DD/MM/YYYY");
        cacheOmie = await buscarTodasContasOmie();
        const contasRM = await buscarLancamentosDoDia(hoje);

        for (const conta of contasRM) {
        const idlan = String(conta.codigo_lancamento_integracao).trim();
        const vencimento = formatarData(conta.data_vencimento);

        if (ultimosIdLancamentos.has(idlan)) continue;

        const jaExiste = cacheOmie.some(omie =>
            String(omie.codigo_lancamento_integracao).trim() === idlan &&
            omie.data_vencimento === vencimento
        );

        if (jaExiste) {
            console.log(`🚫 Conta ${idlan} já existe no Omie. Ignorando...`);
            ultimosIdLancamentos.add(idlan);
            continue;
        }

        console.log(`🆕 Nova conta detectada: ${idlan}, vencimento: ${vencimento}`);
        await enviarContaIndividual(idlan, vencimento);
        console.log(`✅ Envio concluído da conta ${idlan}`);
        ultimosIdLancamentos.add(idlan);

        await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (erro) {
        console.error("❌ Erro no polling de contas:", erro.message);
    }
    }

    function iniciarPolling() {
    console.log("⏰ Agendando envio a cada 30 minutos...");

    // Executa a cada 30 minutos
    cron.schedule("*/30 * * * *", async () => {
        console.log("🚀 Executando envio automático (a cada 30 minutos)");
        await verificarNovasContas();
    });
    }

module.exports = { iniciarPolling };
