const fs = require("fs");
const path = require("path");

function salvarLog(nomeArquivo, sucesso, erros) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-T:.Z]/g, "_");
    const logPath = path.join(__dirname, `../logs/${nomeArquivo}_${timestamp}.txt`);

    const dataAtual = new Date().toLocaleString("pt-BR");

    let logContent = `📅 Log de execução - ${dataAtual}\n`;
    logContent += `\n✅ Contas enviadas com sucesso: ${sucesso.length}\n`;
    sucesso.forEach(c => logContent += `  - ${c.codigo_lancamento_integracao} | Valor: ${c.valor_documento}\n`);

    logContent += `\n❌ Contas com erro: ${erros.length}\n`;
    erros.forEach(e => logContent += `  - ${e.conta.codigo_lancamento_integracao} | Erro: ${e.erro}\n`);

    fs.writeFileSync(logPath, logContent, "utf-8");
    fs.writeFileSync(logPath.replace('.txt', '.json'), JSON.stringify({ sucesso, erros }, null, 2), "utf-8");

    console.log(`📂 Log salvo em: ${logPath}`);
}

module.exports = { salvarLog };
