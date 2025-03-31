const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  }); 

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function timeStamp() {
  return new Date().toLocaleTimeString("pt-BR", { hour12: false });
}


function formatarData(data) {
    if (!data) return null;

 
    if (typeof data === "string") {
        data = new Date(data);
    }
 
    if (!(data instanceof Date) || isNaN(data.getTime())) {
        console.error("❌ Erro ao formatar data, valor inválido:", data);
        return null;
    }
 
    const dia = String(data.getUTCDate()).padStart(2, "0");
    const mes = String(data.getUTCMonth() + 1).padStart(2, "0"); 
    const ano = data.getUTCFullYear();

    return `${dia}/${mes}/${ano}`; 
} 

function aguardarEnter() {
    return new Promise(resolve => {
      rl.question('Aperta [ENTER] pra continuar...', () => resolve());
    });
  }
  


module.exports = { esperar, formatarData, aguardarEnter, timeStamp };
