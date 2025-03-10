const oracledb = require("oracledb");

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE_NAME}`,
};

async function getConnection() {
    try {
        const connection = await oracledb.getConnection(dbConfig);
        console.log("✅ Conexão com Oracle RM estabelecida!");
        return connection;
    } catch (error) {
        console.error("❌ Erro ao conectar no Oracle RM:", error.message);
        throw error;
    }
}


module.exports = { getConnection };
