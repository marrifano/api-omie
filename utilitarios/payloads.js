const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

/**
 * Gera o payload padrão para chamadas na API Omie
 * @param {string} call - Nome da chamada da API Omie
 * @param {object[]} param - Parâmetros da chamada
 * @returns {object} - Payload formatado
 */
function gerarPayload(call, param = [{}]) {
    return {
        call,
        app_key: OMIE_APP_KEY,
        app_secret: OMIE_APP_SECRET,
        param
    };
}

module.exports = { gerarPayload };
