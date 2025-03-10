const axios = require("axios");
const https = require("https");
 
const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

const headers = {
    "Content-Type": "application/json",
    "X-Omie-App-Key": OMIE_APP_KEY,
    "X-Omie-App-Secret": OMIE_APP_SECRET
};

const agent = new https.Agent({ keepAlive: true, minVersion: "TLSv1.2" });

async function omieRequest(url, payload) {
    try {
        const response = await axios.post(url, payload, { headers, httpsAgent: agent });
        return response.data;
    } catch (error) {
        console.error("❌ Erro na requisição Omie:", error.response?.data || error.message);
        throw error;
    }
}

module.exports = { omieRequest };