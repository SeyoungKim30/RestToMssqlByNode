require('dotenv').config();
const logger = require("./logger.js");
const server_config = require('../config.json');
const sql = require('mssql');
const mybatisMapper = require('mybatis-mapper');  //매핑할 마이바티스
const BankMapping = require(`../bankmapping/${server_config.bank}.json`)


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
        var param = { table_importtrsc: BankMapping["5"]["tabletype"] }
        // Get SQL Statement
        var format = { language: 'sql' };
        var query = mybatisMapper.getStatement('mapper1', 'select_importtrsc', param, format);
        var result = await executeQuery(query);
        return result;
    } catch (e) {
        logger.error("select_importingTransaction" + JSON.stringify(e))
    }
}

async function insert_transfer(tabletype, data) {
    /**
     * {
  columnlist: [
    'TRAN_DT',
    'TRAN_DT_SEQ',
    'TRAN_REMITTEE_NM',
    'TRAN_JI_ACCT_NB',
    'TRAN_CMS_CD',
    'TRAN_AMT_REQ',
    'TRAN_IP_BANK_ID',
    'TRAN_IP_ACCT_NB',
    'TRAN_REMITTEE_REALNM',
    'TRAN_IP_NAEYONG',
    'TRAN_JI_NAEYONG',
    'GROUP_NM',
    'LIST_NM'
  ],
  datalist: [
    [
      '2025-05-01',
      '1',
      '4935',
      '0271574035600015',
      '',
      '10000',
      '218',
      '234234242',
      '',
      '입금통장표시내역',
      '출금통장표시내역',
      '202505test - 과거전표',
      '202505test - 과거전표'
    ]
  ]
}
     */
    try {
        mybatisMapper.createMapper(['./src/mapper1.xml']);

        var param = {
            tableName: BankMapping[tabletype]["tabletype"],
            outputList: BankMapping[tabletype]["outputColumn"],
            columnList: data.columnlist,
            dataList: data.datalist
        }
        var query = mybatisMapper.getStatement('mapper1', 'insert1', param, { language: 'sql' });
        console.log("query : " + query)
        var result = await executeQuery(query);
        console.log(result)
        return result;
    } catch (e) { console.log("insert_transfer", e) }
}

async function update_transfer(tabletype, data) {
  let query = `select [ERP_LNK_CTT],[REG_DT],[REG_TM],[CMSV_RMTE_NM], [CMSV_TRMS_ST_CD],[TRNS_DATE],[TRMS_ST_CTT],[TRNS_TIME],[COMM],[ERR_CD],[ERR_MSG] 
  from [HCMS_E2C_EVLM_TRNS_PTCL] 
  where ${filenamecondition} AND (TRMS_ST_CTT is not null OR CMSV_TRMS_ST_CD='R'); `
}

module.exports = {
    select_importingTransaction,
    insert_transfer
}