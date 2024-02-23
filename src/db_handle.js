// 필요한 패키지 로드
require('dotenv').config();
const sql = require('mssql');

const poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    options: {
        encrypt: true, // for Azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 600000
    }
};

const pool = new sql.ConnectionPool(poolConfig);

async function executeQuery() {
    try {
        await pool.connect();
        const result = await pool.query('select * from HCMS_E2C_DMST_REMT_PTCL');
        console.log(result.recordset);
    } catch (err) {
        console.error('Error occurred:', err);
    } finally {
        pool.close();
    }
}

//executeQuery() ;

//function insert_HCMS_E2C_EVLM_TRNS_PTCL() {}

module.exports = { executeQuery };