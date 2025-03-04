const axios = require("axios");
const https = require("https");
const fs = require("fs");
const path = require("path");
const oracledb = require("oracledb");

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;
const OMIE_URL = "https://app.omie.com.br/api/v1/geral/contacorrente/";

const headers = {
    "Content-Type": "application/json",
    "X-Omie-App-Key": OMIE_APP_KEY,
    "X-Omie-App-Secret": OMIE_APP_SECRET
};

const agent = new https.Agent({ keepAlive: true, minVersion: "TLSv1.2" });

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE_NAME}`,
  };


async function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
 

async function buscarContasRM() {

    await esperar(1000);
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);
  
      const sql = `
              SELECT 
                  CX.CODCXA as cCodCCInt,
                  'CC' AS tipo_conta_corrente,  
                  F.NUMBANCO AS codigo_banco,
                  CX.CODCXA AS descricao,
                  F.NUMAGENCIA as codigo_agencia,
                  CASE 
                      WHEN F.DIGCONTA IS NOT NULL 
                      THEN F.NROCONTA || '-' || F.DIGCONTA
                      ELSE F.NROCONTA 
                  END AS  numero_conta_corrente,
                  0 AS saldo_inicial
              FROM FCXA CX
              LEFT JOIN FCONTA F ON CX.NUMAGENCIA = f.NUMAGENCIA and cx.NUMBANCO = f.NUMBANCO and cx.nroconta = F.NROCONTA 
              LEFT JOIN GBANCO B ON F.NUMBANCO = B.NUMBANCO 

              WHERE CX.DESCRICAO IS NOT NULL 
                  and CX.SALDOINSTANTANEO <> 0  
                  and F.NUMAGENCIA is not null 
      `;
  
      const result = await connection.execute(sql);
   
      const contas = result.rows.map((row) => ({
        cCodCCInt: row[0],  
        tipo_conta_corrente: row[1],  
        codigo_banco: row[2],  
        descricao: row[3],   
        codigo_agencia: row[4],   
        numero_conta_corrente: row[5],   
        saldo_inicial: row[6]   
      }));

      console.log(`🔄 ${contas.length} contas carregadas do RM.`);

      return contas;
    } catch (error) {
      console.error("❌ Erro ao buscar contas no RM:", error);
      return [];
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  } 

async function listarContasCorrentes(req, res) { 
  await esperar(1000);
    try {
        const payload = {
            call: "ListarContasCorrentes",
            app_key: OMIE_APP_KEY,
            app_secret: OMIE_APP_SECRET,
            param: [{
                "pagina": 1,
                "registros_por_pagina": 100,
                "apenas_importado_api": "N"
            }]
        };
        

        console.log("🔍 Buscando contas correntes..."); 
        const response = await axios.post(OMIE_URL, payload, { 
          headers, 
          httpsAgent: agent });

        res.json({ mensagem: "Contas correntes listadas com sucesso!", contas_correntes: response.data });

    } catch (error) {
    console.error("❌ Erro ao listar contas correntes:", error.message);
    res.status(500).json({ error: error.message });
}
}

async function enviarParaOmie(contas) {
    const resultados = [];
    const contasFalharam = []; 
  
    for (const conta of contas) {
      try {
        const payload = {
          call: "IncluirContaCorrente",
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [conta],
        };
  
        console.log(` Enviando conta: ${conta.descricao}`);
        const response = await axios.post(OMIE_URL, payload, {
          headers: { "Content-Type": "application/json" },
        });
  
        console.log(`✅ Conta "${conta.descricao}" enviada com sucesso!`);
        resultados.push(response.data);

        await new Promise(resolve => setTimeout(resolve, 600));


      } catch (error) {
        console.error(` Erro ao enviar conta ${conta.descricao}:`, error.response?.data || error.message);
        contasFalharam.push(conta);
      }
    }
  
    await new Promise(resolve => setTimeout(resolve, 600));

    console.log(`✅ Envio concluído: ${resultados.length} contas enviadas com sucesso.`);
    
    if (contasFalharam.length > 0) {
        console.warn(`⚠️ ${contasFalharam.length} contas falharam no envio.`);
        console.table(contasFalharam.map(c => ({
            descricao: c.descricao,
            codigo_banco: c.codigo_banco,
            numero_conta_corrente: c.numero_conta_corrente
        })));
    }
    return { enviados: resultados, falhados: contasFalharam };
  }

async function incluirContaCorrente(req, res) {

  await esperar(1000);
    try {  
      console.log("🔄 Buscando contas no RM TOTVS...");
      const contas = await buscarContasRM();
      if (contas.length === 0) {
        return res.status(400).json({ erro: "Nenhuma conta importada encontrada no RM TOTVS." });
      }
  
      const resultados = await enviarParaOmie(contas);
  
      res.json({
        mensagem: "Contas correntes importadas e enviadas para o OMIE com sucesso!",
        contas_correntes: resultados,
      });
  
    } catch (error) {
      console.error("❌ Erro geral:", error);
      res.status(500).json({ erro: error.message });
    }
  }
 
  async function listarDepartamentosOmie() {
    await esperar(1000);
    try {
        const payload = {
            call: "ListarDepartamentos",
            app_key: OMIE_APP_KEY,
            app_secret: OMIE_APP_SECRET,
            param: [{ "pagina": 1, "registros_por_pagina": 500 }]
        };

        console.log("🔍 Buscando departamentos no Omie...");
        const response = await axios.post("https://app.omie.com.br/api/v1/geral/departamentos/", payload, { headers, httpsAgent: agent });

        if (response.data && response.data.departamentosCadastro) {
            const departamentos = response.data.departamentosCadastro.map(dep => ({
                codigo: dep.codigo,
                descricao: dep.descricao
            }));

            console.log("📋 Departamentos encontrados:", JSON.stringify(departamentos, null, 2));
            return departamentos;
        }

        console.warn("⚠️ Nenhum departamento encontrado.");
        return [];
    } catch (error) {
        console.error("❌ Erro ao buscar departamentos no Omie:", error.response?.data || error.message);
        return [];
    }
}

async function excluirTodasContasCorrentesOmie() {
  const contas = await listarDepartamentosOmie();

  if (contas.length === 0) {
      console.warn("⚠️ Nenhuma conta corrente para excluir.");
      return;
  }

  console.log(`🗑️ Excluindo ${contas.length} contas correntes...`);

  for (const conta of contas) {
      try {
          await new Promise(resolve => setTimeout(resolve, 1000));  

          const payload = {
              call: "ExcluirContaCorrente",
              app_key: OMIE_APP_KEY,
              app_secret: OMIE_APP_SECRET,
              param: [{
                  nCodCC: conta.nCodCC,
                  cCodCCInt: conta.cCodCCInt
              }]
          };

          const response = await axios.post("https://app.omie.com.br/api/v1/geral/contacorrente/", payload, { headers, httpsAgent: agent });

          console.log(`✅ Conta "${conta.cCodCCInt}" (Código Omie: ${conta.nCodCC}) excluída!`, response.data);
      } catch (error) {
          console.error(`❌ Erro ao excluir conta "${conta.cCodCCInt}" (Código Omie: ${conta.nCodCC}):`, error.response?.data || error.message);
      }
  }

  console.log("🚀 Exclusão de contas correntes finalizada!");
}
  

/* 
async function incluirContaCorrente(req, res) { 
    try { 
        const contasPath = path.resolve(__dirname, "../modelos/contasCorrentes.json");
        if (!fs.existsSync(contasPath)) {
            return res.status(400).json({ erro: "Arquivo de contas correntes não encontrado." });
        } 

        const contasCorrentes = JSON.parse(fs.readFileSync(contasPath, "utf-8"));
        if (!Array.isArray(contasCorrentes) || contasCorrentes.length === 0) {
            return res.status(400).json({ erro: "Nenhuma conta corrente válida encontrada no arquivo." });
        } 

        const resultados = [];
        console.log(contasCorrentes)

        for (const conta of contasCorrentes) { 
            if (!conta.cCodCCInt || !conta.descricao || !conta.tipo_conta_corrente || !conta.codigo_banco  ) {
                console.warn(`⚠️ Conta inválida:`, conta);
                continue;
            }

            const payload = {
                call: "IncluirContaCorrente",
                app_key: OMIE_APP_KEY,
                app_secret: OMIE_APP_SECRET,
                param: [{
                    "cCodCCInt": conta.cCodCCInt,
                    "tipo_conta_corrente": conta.tipo_conta_corrente,
                    "codigo_banco": conta.codigo_banco,
                    "descricao": conta.descricao, 
                    "numero_conta_corrente": conta.numero_conta_corrente,
                    "saldo_inicial": conta.saldo_inicial ,
                }]
            };

            console.log(`➕ Incluindo conta: ${conta.descricao}`);
            const response = await axios.post(OMIE_URL, payload, { headers: headers, httpsAgent: agent });

            console.log(`✅ Conta corrente "${conta.descricao}" incluída com sucesso!`, response.data);
            resultados.push(response.data);
        }

        res.json({
            mensagem: "Contas correntes incluídas com sucesso!",
            contas_correntes: resultados
        });

    } catch (error) {
        console.error("❌ Erro ao incluir contas correntes:", error.response?.data || error.message);
        res.status(500).json({ erro: error.response?.data || error.message });
    }
}
*/

module.exports = { listarContasCorrentes, incluirContaCorrente, excluirTodasContasCorrentesOmie };
