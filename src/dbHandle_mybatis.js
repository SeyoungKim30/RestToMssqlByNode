require('dotenv').config();
const server_config = require('../config.json');
const CONFIG = require('../config/dbinfo.json')
const sql = require('mssql');
const mybatisMapper = require('mybatis-mapper');  //매핑할 마이바티스
const BANK = server_config.bank;


const pool = new sql.ConnectionPool({
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT),
    options: {
        encrypt: (process.env.DB_POOLENCRYPT == "true") ? true : false, // for Azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 200000
    }
});

async function executeQuery(querystring) {
    try {
        await pool.connect();
        var result = { "type": "success", "result": await pool.query(querystring) };
    } catch (err) {
        var result = { "type": "error", "error": err.message };
    } finally {
        pool.close();
    }
    return result;
}


async function select_importingTransaction() {
    try {
        mybatisMapper.createMapper(['./src/mapper1.xml']);

        // SQL Parameters
        var param = { table_importtrsc: CONFIG.table_transaction }
        // Get SQL Statement
        var format = { language: 'sql' };
        var query = mybatisMapper.getStatement('mapper1', 'select_importtrsc', param, format);
        var result = await executeQuery(query);
        return result;
    } catch (e) {
        logger.error("select_importingTransaction" + JSON.stringify(e))
    }
}

async function insert_transfer(tabletype,data) {
    mybatisMapper.createMapper(['./src/mapper1.xml']);

    var format = { language: 'sql' };

    var param ={////////////////config에서 가져오기
        tableName:CONFIG[BANK]["tabletype"][tabletype],
        columnMapping: [
        { dbColumn: "CUST_NO", dataKey: "custrecord_swk_cms_cust_no" },
        { dbColumn: "TRSC_AMT", dataKey: "custrecord_swk_cms_amt" },
        { dbColumn: "ERP_LNK_CTT", dataKey: "internalid" },
      ],
      dataList: [
        {
          custrecord_swk_cms_cust_no: '123',
          custrecord_swk_cms_amt: 1000,
          internalid: '456',
        }]}


    var query = mybatisMapper.getStatement('mapper1', 'insert1',   param     , format);
    var result = await executeQuery(query);
}

module.exports = {
    select_importingTransaction
}