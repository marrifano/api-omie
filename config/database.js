const oracledb = require("oracledb");

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT}/${process.env.ORACLE_SERVICE_NAME}`,
};

async function getConnection() {
    return await oracledb.getConnection(dbConfig);
}

module.exports = { getConnection };
