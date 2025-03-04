const axios = require("axios");
const https = require("https"); 
const fs = require("fs");
const path = require("path");
const oracledb = require("oracledb");

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;
const OMIE_URL = "https://app.omie.com.br/api/v1/financas/contapagar/";
const OMIE_CATEGORIA_URL = "https://app.omie.com.br/api/v1/geral/categorias/";
const OMIE_CLIENTES_URL = "https://app.omie.com.br/api/v1/geral/clientes/";
const OMIE_CCORRENTE_URL = "https://app.omie.com.br/api/v1/geral/contacorrente/";

 
const agent = new https.Agent({ keepAlive: true, minVersion: "TLSv1.2" });
const headers = {
    "Content-Type": "application/json",
    "X-Omie-App-Key": OMIE_APP_KEY,
    "X-Omie-App-Secret": OMIE_APP_SECRET
};
const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE_NAME}`,
  }; 

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function buscarCategoriasOmie() {
    await esperar(1000); 
    try {
        const payload = {
            call: "ListarCategorias",
            app_key: OMIE_APP_KEY,
            app_secret: OMIE_APP_SECRET,
            param: [{ "pagina": 1, "registros_por_pagina": 5 }]
        };
        
        console.log("🔍 Carregando as categorias no Omie...");
        const response = await axios.post(OMIE_CATEGORIA_URL, payload, { headers, httpsAgent: agent }); 
        
        if (response.data && response.data.categoria_cadastro) {
            return response.data.categoria_cadastro.map(cat => ({
                codigo: cat.codigo,
                descricao: cat.descricao.toLowerCase()
            }));
        }
        
        return [];
    } catch (error) {
        console.error("❌ Erro ao buscar categorias no Omie:", error);
        return [];
    }
}

    
    async function buscarCodigoContaCorrente(idContaCorrente) { 
        console.log(idContaCorrente)   
        await esperar(1000);  


        try {
            const payload = {
                call: "ListarContasCorrentes",
                app_key: OMIE_APP_KEY,
                app_secret: OMIE_APP_SECRET,
                param: [{ "pagina": 1, "registros_por_pagina": 150 }]
            };

            const response = await axios.post(OMIE_CCORRENTE_URL, payload, { headers, httpsAgent: agent });
    

    
            if (response.data && response.data.ListarContasCorrentes) { 
                const contasMap = response.data.ListarContasCorrentes.map(conta => ({
                    nCodCC: conta.nCodCC,
                    cCodCCInt: conta.cCodCCInt
                }));
    
                const contaEncontrada = contasMap.find(conta => conta.cCodCCInt === idContaCorrente.toString());
                 
                if (contaEncontrada) {
                    return contaEncontrada.nCodCC; 
                } else {
                    console.warn(`⚠️ Conta corrente não encontrada para o código: ${idContaCorrente}`);
                    return null;
                }
            }

            return [];
        } catch (error) {
            console.error("❌ Erro ao buscar contas correntes no Omie:", error);
            return [];
        }
    }
    
    async function buscarClienteOmie(codigoClienteRM) {
        try {
            await esperar(1000); 
            const payload = {
                call: "ConsultarCliente",
                app_key: OMIE_APP_KEY,
                app_secret: OMIE_APP_SECRET,
                param: [{ "codigo_cliente_integracao": codigoClienteRM }]
            };

            console.log(`🔍 Buscando cliente no Omie: ${codigoClienteRM}`);

            const response = await axios.post(OMIE_CLIENTES_URL, payload, { headers, httpsAgent: agent });

            if (response.data && response.data.codigo_cliente_omie) {
                return response.data.codigo_cliente_omie;   
            } else {
                console.warn(`⚠️ Cliente não encontrado no Omie: ${codigoClienteRM}`);
                return null;  
            }
        } catch (error) {
            console.error(`❌ Erro ao buscar cliente ${codigoClienteRM}:`, error.response?.data || error.message);
            return null;
        }
    }

    async function buscarContasPagarRM() {
        let connection;
        try {
            connection = await oracledb.getConnection(dbConfig);

            const sql = `
                    SELECT distinct  
                            L.IDLAN AS codigo_lancamento_integracao,   
                            L.CODCFO AS codigo_cliente_fornecedor,
                            L.DATAVENCIMENTO as data_vencimento,       
                            L.VALORORIGINAL as valor_documento,
                            NVL(T.DESCRICAO, 'PADRAO_OMIE') AS codigo_categoria,
                            L.DATAPREVBAIXA as data_previsao,        
                            L.CODCXA as id_conta_corrente
                    
                    
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

                        WHERE 
                            L.DATAVENCIMENTO = TO_DATE('01/02/2025', 'DD/MM/YYYY')
                            AND L.PAGREC = 2 
                            AND L.CODCOLIGADA IN (1, 8, 10, 12, 15, 16, 21)
                            AND L.STATUSLAN IN (0, 1)
                            AND FBAIXA.DATACANCELBAIXA IS NULL
                    
                    
            `; 
            const result = await connection.execute(sql); 
            return result.rows.map((row) => ({
                codigo_lancamento_integracao: row[0],
                codigo_cliente_fornecedor: row[1],
                data_vencimento: row[2],
                valor_documento: row[3], 
                codigo_categoria: row[4], 
                data_previsao: row[5],
                id_conta_corrente: row[6],
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

    async function enviarParaOmie(contas) {
        const resultados = [];
        const sucesso = [];
        const erros = [];

        console.log("📦 Contas formatadas antes do envio:", JSON.stringify(contas, null, 2)); 

        for (const conta of contas) {
            try {
                await esperar(1000); 
                const payload = {
                    call: "IncluirContaPagar",
                    app_key: OMIE_APP_KEY,
                    app_secret: OMIE_APP_SECRET,
                    param: [conta],
                };  

                console.log(` Enviando conta: ${conta.codigo_lancamento_integracao}`);
                const response = await axios.post(OMIE_URL, payload, {
                    headers: headers,
                    httpsAgent: agent,
                }); 
    
                console.log(`✅ Conta "${conta.codigo_lancamento_integracao}" enviada com sucesso!`);
                sucesso.push(conta);
                resultados.push(response.data);
            } catch (error) {
                const mensagemErro = `Erro ao enviar conta ${conta.codigo_lancamento_integracao}: ${error.response?.data?.faultstring || error.message}`;
                console.error(`❌ ${mensagemErro}`);
                erros.push({ conta, erro: mensagemErro });
            }
        }


        // ARQUIVO DE LOG 
            const now = new Date();
            const timestamp = now.toISOString().replace(/[-T:.Z]/g, "_");
            const logPath = path.join(__dirname, `../logs/log_contas_${timestamp}.txt`);

            const dataAtual = new Date().toLocaleString("pt-BR");

            let logContent = `📅 Log de execução - ${dataAtual}\n`;
            logContent += `\n✅ Contas enviadas com sucesso: ${sucesso.length}\n`;
            sucesso.forEach(c => logContent += `  - ${c.codigo_lancamento_integracao} | Valor: ${c.valor_documento}\n`);

            logContent += `\n❌ Contas com erro: ${erros.length}\n`;
            erros.forEach(e => logContent += `  - ${e.conta.codigo_lancamento_integracao} | Erro: ${e.erro}\n`);

    //        fs.writeFileSync(logPath, logContent, "utf-8");
            fs.writeFileSync(logPath.replace('.txt', '.json'), JSON.stringify({ sucesso, erros }, null, 2), "utf-8");


            console.log(`📂 Log salvo em: ${logPath}`);


        return resultados;
    }

    async function incluirContaPagar(req, res) { 
        try {
        const categoriasOmie = await buscarCategoriasOmie(); 
        const contas = await buscarContasPagarRM(); 
         
        console.log("CATEGORIAS", categoriasOmie)
        const codigoPadrao = "0.01.99"; 

        const formatarData = (data) => {
            if (!data) return null;   
            const dataFormatada = new Date(data).toISOString().split('T')[0].split('-').reverse().join('/');
            return dataFormatada;
        };
 
        for (let conta of contas) { 
            //ACHAR CLIENTE
            conta.codigo_cliente_fornecedor = await buscarClienteOmie(conta.codigo_cliente_fornecedor) || "0";  
             
            //ACHAR CONTA CORRENTE
            const codigoConta = await buscarCodigoContaCorrente(conta.id_conta_corrente);
            if (codigoConta) {
                conta.id_conta_corrente = codigoConta;
            }
            
            //ACHAR A CATEGORIA
            console.log('descricao: ', categoriasOmie.descricao)
            console.log('conta codigo: ', conta.codigo_categoria)
            const categoriaEncontrada = categoriasOmie.find(cat => console.log('DESC:', cat.descricao),  console.log('DESCRICAO:', conta.codigo_categoria)) // === conta.codigo_categoria);
            conta.codigo_categoria = categoriaEncontrada ? categoriaEncontrada.codigo : codigoPadrao;

        } 
        
        contas = contas.map(conta => { 
        
            let contaFormatada = {
                ...conta,
                data_vencimento: formatarData(conta.data_vencimento),
                data_previsao: formatarData(conta.data_previsao),
            };
         
            return contaFormatada;
        });

        console.log("📦 Contas formatadas antes do envio:", JSON.stringify(contas, null, 2));
        console.log("Finalizado")
    return
        const resultados = await enviarParaOmie(contas);
        res.json({ mensagem: "Contas a pagar enviadas com sucesso!", contas_pagar: resultados });
       } catch (error) {
        console.error("❌ Erro geral:", error);
        res.status(500).json({ erro: error.message });
    }
}
 

async function listarContasAPagar(req, res) {  
    console.log("buscando")
  try {
      const payload = {
          call: "ListarContasPagar",
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{
              "pagina": 1,
              "registros_por_pagina": 100,
              "apenas_importado_api": "N"
          }]
      };

      console.log("🔍 Buscando contas a pagar...");
      const response = await axios.post(OMIE_URL, payload, { headers, httpsAgent: agent });

      res.json({ mensagem: "Contas a pagar listadas com sucesso!", contas_correntes: response.data });

  } catch (error) {
  console.error("❌ Erro ao listar contas a pagar:", error.message);
  res.status(500).json({ error: error.message });
}
}



module.exports = { listarContasAPagar, incluirContaPagar };
