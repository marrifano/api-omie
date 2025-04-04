const fs = require("fs");
const path = require("path");
const { getConnection } = require("../config/database");
const { esperar } = require("../utilitarios/auxiliares");

function carregarQuery(nomeArquivo) {
    return fs.readFileSync(
        path.join(__dirname, "./queries/", nomeArquivo),
        "utf8"
    );
} 

async function executarQueryComParametros(sql, parametros) {
    await esperar(500);
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, parametros);
        return result.rows;
    } catch (err) {
        console.error("❌ Erro ao executar query:", err);
        return [];
    } finally {
        if (connection) await connection.close();
    }
}


async function buscarContasPagarRM(dataVencimento) {
    const sql = carregarQuery("buscarContasPorData.sql");
    const rows = await executarQueryComParametros(sql, { dataVencimento });
    return mapearContas(rows);
}

async function buscarContaRM(idlan, vencimento) {
    const sql = carregarQuery("buscarContaPorId.sql");
    const rows = await executarQueryComParametros(sql, { idlan, vencimento });
    return mapearContas(rows);
}

async function buscarDadosClienteRM(codigoClienteRM) {
    const sql = carregarQuery("buscarCliente.sql");
    const rows = await executarQueryComParametros(sql, { codigoClienteRM });

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
        codigo_integracao: row[0],
        razao_social: row[1],
        nome_fantasia: row[2],
        cnpj_cpf: row[3],
        endereco: row[4],
        numero: row[5],
        ramo_atividade: row[16]
    };
}

function mapearContas(rows) {
    return rows.map(row => ({
        codigo_lancamento_integracao: row[0],
        codigo_cliente_fornecedor: row[1],
        data_vencimento: row[2],
        valor_documento: row[3],
        codigo_categoria: row[4],
        data_previsao: row[5],
        id_conta_corrente: row[6],
        statuslan: row[7],
        valor_baixado: row[8],
        codigo_baixa_integracao: row[0],
        desconto: row[9],
        juros: row[10],
        multa: row[11],
        data_baixa: row[12],
        observacao: row[13],
        departamento: row[14],
        coligada: row[15],
        valor_ir: row[16],
        retem_ir: "N"
    }));
}

module.exports = {
    buscarContasPagarRM,
    buscarContaRM,
    buscarDadosClienteRM
};