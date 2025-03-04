const fs = require("fs");
const path = require("path");

function salvarLog(nomeArquivo, conteudo) {
    const logPath = path.join(__dirname, `../logs/${nomeArquivo}.json`);
    fs.writeFileSync(logPath, JSON.stringify(conteudo, null, 2), "utf-8");
    console.log(`📂 Log salvo em: ${logPath}`);
}

module.exports = { salvarLog };
