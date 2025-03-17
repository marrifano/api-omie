const { getConnection } = require("../config/database");

async function buscarContasPagarRM(dataVencimento) {
    let connection;
    try {
        connection = await getConnection();

        const sql = `SELECT DISTINCT  
                        L.CODCOLIGADA || L.IDLAN AS codigo_lancamento_integracao,
                        L.CODCFO AS codigo_cliente_fornecedor,
                        L.DATAVENCIMENTO AS data_vencimento,       
                        L.VALORORIGINAL AS valor_documento,
                        NVL(T.DESCRICAO, 'Categoria Não Informada') AS codigo_categoria,
                        L.DATAPREVBAIXA AS data_previsao, 
                        L.CODCXA AS id_conta_corrente,
                        L.STATUSLAN, 
                        L.VALORBAIXADO AS valor_baixado,
                        NVL(    
                            CASE 
                                WHEN L.IDBAIXAPARCIAL IS NULL THEN 
                                    (L.VALOROP1 + L.VALOROP2 + L.VALOROP3 + 
                                        CASE 
                                            WHEN L.VALORDESCONTOBX IS NOT NULL AND L.VALORDESCONTOBX <> 0 THEN L.VALORDESCONTOBX
                                            WHEN L.VALORDESCONTO IS NOT NULL AND L.VALORDESCONTO <> 0 THEN L.VALORDESCONTO
                                            ELSE 0
                                        END + L.VALOROP4 + L.VALOROP5) 
                                ELSE NULL 
                            END, NULL
                        ) AS desconto_total,
                        L.VALORJUROSBX AS juros, 
                        L.VALORMULTABX AS multa,
                        L.DATABAIXA AS data_baixa,
                        L.HISTORICO AS observacao
                        
                    FROM FLAN L    
                        LEFT JOIN GFILIAL F ON L.CODCOLIGADA = F.CODCOLIGADA AND L.CODFILIAL = F.CODFILIAL
                        LEFT JOIN FCFO C ON L.CODCFO = C.CODCFO 
                        LEFT JOIN TMOV M ON M.CODCOLIGADA = F.CODCOLIGADA AND M.IDMOV = L.IDMOV 
                        LEFT JOIN FCXA CX ON CX.CODCXA = L.CODCXA  
                        LEFT JOIN GBANCO B ON B.NUMBANCO = CX.NUMBANCO  
                        LEFT JOIN FLANBAIXA FBAIXA ON FBAIXA.IDLAN = L.IDLAN AND FBAIXA.CODCOLIGADA = L.CODCOLIGADA AND FBAIXA.CODFILIAL = L.CODFILIAL 
                        LEFT JOIN GCCUSTO CC ON CC.CODCCUSTO = FBAIXA.CODCCUSTO AND CC.CODCOLIGADA = FBAIXA.CODCOLIGADA
                        LEFT JOIN FLANRATCCU NATU ON NATU.CODCCUSTO = CC.CODCCUSTO AND NATU.IDLAN = FBAIXA.IDLAN AND NATU.CODCOLIGADA = L.CODCOLIGADA
                        LEFT JOIN TTBORCAMENTO T ON NATU.CODCOLIGADA = T.CODCOLIGADA AND NATU.CODNATFINANCEIRA = T.CODTBORCAMENTO
                        LEFT JOIN GDEPTO DEPT ON DEPT.CODDEPARTAMENTO = L.CODDEPARTAMENTO AND DEPT.CODCOLIGADA = L.CODCOLIGADA AND L.CODFILIAL = DEPT.CODFILIAL
                    WHERE  L.DATAVENCIMENTO = TO_DATE(:dataVencimento, 'DD/MM/YYYY') 
                        AND L.PAGREC = 2 
                        AND L.CODCOLIGADA IN (1, 8, 10, 12, 15, 16, 21)
                        AND L.STATUSLAN IN (0, 1)
                        AND FBAIXA.DATACANCELBAIXA IS NULL
                        AND L.CODCXA <> '777'  
                        AND T.DESCRICAO <> 'Transferências entre contas' 
                        AND L.CODCFO = 'A151510'`; 

        console.log(`🔍 Buscando contas a pagar para a data: ${dataVencimento}`);

        const result = await connection.execute(sql, { dataVencimento });

        return result.rows.map((row) => ({
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
            observacao: row[13]
        }));

    } catch (error) {
        console.error("❌ Erro ao buscar contas a pagar no RM:", error);
        return [];
    } finally {
        if (connection) {
            await connection.close();
        }
    }
}
   
async function buscarDadosClienteRM(codigoClienteRM) {
    let connection;
    try {
        connection = await getConnection();

        const sql = `
            SELECT DISTINCT
                E.CODCFO AS CODIGO_INTEGRACAO,
                E.NOME AS RAZAO_SOCIAL,
                E.NOMEFANTASIA,
                E.CGCCFO AS CNPJ_CPF,
                E.RUA AS ENDERECO,
                E.NUMERO,
                E.BAIRRO,
                E.COMPLEMENTO,
                E.CODETD AS ESTADO,
                E.CIDADE,
                E.CEP,
                E.CONTATO,
                E.EMAIL,
                E.TELEFONE,
                E.INSCRESTADUAL,
                E.INSCRMUNICIPAL,
                CASE 
                    WHEN E.RAMOATIV = 1 THEN 'COMERCIO'
                    WHEN E.RAMOATIV = 3 THEN 'INDÚSTRIA'
                    WHEN E.RAMOATIV = 16 THEN 'RURAL'
                    ELSE 'OUTROS'
                END AS RAMO_ATIVIDADE
            FROM FCFO E
            WHERE E.CODCFO = :codigoClienteRM
        `;

        console.log(`🔍 Buscando dados do cliente RM: ${codigoClienteRM}`);
 
        const result = await connection.execute(sql, { codigoClienteRM: codigoClienteRM });

        if (result.rows.length === 0) {
            console.warn(`⚠️ Cliente ${codigoClienteRM} não encontrado no RM.`);
            return null;
        }

        const row = result.rows[0];
    
            return {
                codigo_integracao: row[0],
                razao_social: row[1],
                nome_fantasia: row[2],
                cnpj_cpf: row[3],
                endereco: row[4],
                numero: row[5],
                bairro: row[6],
                complemento: row[7],
                estado: row[8],
                cidade: row[9],
                cep: row[10],
                contato: row[11],
                email: row[12],
                telefone: row[13],
                inscricao_estadual: row[14],
                inscricao_municipal: row[15],
                ramo_atividade: row[16]
            };

    } catch (error) {
        console.error("❌ Erro ao buscar dados do cliente no RM:", error);
        return null;
    } finally {
        if (connection) await connection.close();
    }
}


module.exports = { buscarContasPagarRM , buscarDadosClienteRM };
