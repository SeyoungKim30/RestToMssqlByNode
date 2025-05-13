require('dotenv').config();
const server_config = require('../config.json');
const db_handle = require('./dbHandle_mybatis.js')
const logger = require("./logger.js");
const oauth = require("./oauth.js")

const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require('qs');
const sql = require('mssql');
const mybatisMapper = require('mybatis-mapper');  //매핑할 마이바티스
const BankMapping = require(`../bankmapping/${server_config.bank}.json`)
const express = require("express");
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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


async function put_request_to_ns(fn_name, put_data, bearer_token) {
    let put_config = {
        method: "put",
        maxBodyLength: Infinity,
        url: server_config.restlet_url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + bearer_token
        },
        data: JSON.stringify(put_data)
    };
    var put_response = await axios.request(put_config);
    if (put_response.data.type == "success") {
        logger.info(`${put_data.table} fn ${fn_name} : put_request_to_ns :: ${JSON.stringify(put_response.data)} :: ${JSON.stringify(put_data)}`);
        return true;
    } else {
        logger.error(`${put_data.table} fn ${fn_name} : put_request_to_ns :: ${JSON.stringify(put_response.data)} :: ${JSON.stringify(put_data)}`);
        return false;
    }
}


async function executeQuery_noclose(querystring) {
    let transaction;
    try {
        await pool.connect();
        console.log("pool connected")
        // 트랜잭션 시작
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 쿼리 실행
        const request = new sql.Request(transaction);
        const result = await request.query(querystring);
        return { "type": "success", "result": result, "transaction": transaction };

    } catch (err) {
        // 오류 발생 시 롤백
        if (transaction) {
            await transaction.rollback();
        }
        logger.error(`DB : executeQuery :: ${err.message} :: ${querystring}`);
        return { "type": "error", "error": err.message, "transaction": transaction };
    }
}

async function pool_cloes(put_result, insert_result) {
    console.log("pool close " + JSON.stringify(put_result))
    console.log("insert_result " + (insert_result.transaction))
    try {
        if (put_result == true) {
            await insert_result.transaction.commit();
            console.log("put - pool 닫기 성공");
        } else {
            await insert_result.transaction.rollback();
        }
    } catch (e) {
        logger.error(`DB : pool_cloes :: ${JSON.stringify(e)}`);
        if (insert_result.transaction) {
            await insert_result.transaction.rollback();
        }
    } finally {
        pool.close();
    }
}


async function testing1() {
    try {
        await pool.connect();
        var result = { "type": "success", "result": await pool.query(`SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IB_BUlK_TRAN';`) };
        console.log(result.result.recordset)

        var param = {
            tableName: BankMapping["1"]["tabletype"],
            outputList: BankMapping["1"]["outputColumn"],
            columnList: ["TRAN_DT", "GROUP_NM", "LIST_NM"],
            dataList: [["11", "12", "13"], ["21", "22", "23"], ["31", "32", "33"]],
        }

       // mybatisMapper.createMapper(['./src/mapper1.xml']);
      //  var query = mybatisMapper.getStatement('mapper1', 'insert1', param, { language: 'sql' });
      //  console.log(query)
        executeQuery_noclose(query).then(function (result) {

            pool_cloes(true, insert_result);
        });
    } catch (e) {
        console.log(e)
    }
}


async function testing2() {
    const columnMaxLength = [
        { COLUMN_NAME: 'TRAN_DT', CHARACTER_MAXIMUM_LENGTH: 8 },
        { COLUMN_NAME: 'TRAN_DT_SEQ', CHARACTER_MAXIMUM_LENGTH: 5 },
        { COLUMN_NAME: 'GROUP_NM', CHARACTER_MAXIMUM_LENGTH: 30 },
        { COLUMN_NAME: 'LIST_NM', CHARACTER_MAXIMUM_LENGTH: 10 },
        { COLUMN_NAME: 'LIST_NB', CHARACTER_MAXIMUM_LENGTH: 10 },
        { COLUMN_NAME: 'LIST_NB_SEQ', CHARACTER_MAXIMUM_LENGTH: 10 },
        { COLUMN_NAME: 'TRAN_JI_ACCT_NB', CHARACTER_MAXIMUM_LENGTH: 20 },
        { COLUMN_NAME: 'TRAN_IP_BANK_ID', CHARACTER_MAXIMUM_LENGTH: 3 },
        { COLUMN_NAME: 'TRAN_IP_ACCT_NB', CHARACTER_MAXIMUM_LENGTH: 20 },
        { COLUMN_NAME: 'TRAN_AMT_REQ', CHARACTER_MAXIMUM_LENGTH: 18 },
        { COLUMN_NAME: 'TRAN_AMT', CHARACTER_MAXIMUM_LENGTH: 18 },
        { COLUMN_NAME: 'TRAN_AMT_ERR', CHARACTER_MAXIMUM_LENGTH: 18 },
        { COLUMN_NAME: 'TRAN_FEE', CHARACTER_MAXIMUM_LENGTH: 15 },
        { COLUMN_NAME: 'TRAN_REMITTEE_NM', CHARACTER_MAXIMUM_LENGTH: 20 },
        { COLUMN_NAME: 'TRAN_REMITTEE_REALNM', CHARACTER_MAXIMUM_LENGTH: 20 },
        { COLUMN_NAME: 'TRAN_JI_NAEYONG', CHARACTER_MAXIMUM_LENGTH: 20 },
        { COLUMN_NAME: 'TRAN_IP_NAEYONG', CHARACTER_MAXIMUM_LENGTH: 20 },
        { COLUMN_NAME: 'TRAN_CMS_CD', CHARACTER_MAXIMUM_LENGTH: 32 },
        { COLUMN_NAME: 'TRAN_MEMO', CHARACTER_MAXIMUM_LENGTH: 20 },
        { COLUMN_NAME: 'UPCHE_KEY', CHARACTER_MAXIMUM_LENGTH: 20 },
        { COLUMN_NAME: 'TR_DATE', CHARACTER_MAXIMUM_LENGTH: 8 },
        { COLUMN_NAME: 'TR_TIME', CHARACTER_MAXIMUM_LENGTH: 6 },
        { COLUMN_NAME: 'TRAN_REG_DATE', CHARACTER_MAXIMUM_LENGTH: 8 },
        { COLUMN_NAME: 'TRAN_REG_TIME', CHARACTER_MAXIMUM_LENGTH: 6 },
        { COLUMN_NAME: 'TRAN_STATUS', CHARACTER_MAXIMUM_LENGTH: 2 },
        { COLUMN_NAME: 'TRAN_TYPE_CD', CHARACTER_MAXIMUM_LENGTH: 5 },
        { COLUMN_NAME: 'TRAN_RESULT_CD', CHARACTER_MAXIMUM_LENGTH: 10 },
        { COLUMN_NAME: 'NS_RECORDID', CHARACTER_MAXIMUM_LENGTH: 10 },
        { COLUMN_NAME: 'werire', CHARACTER_MAXIMUM_LENGTH: null }
    ]
    try {
        var param = {
            tableName: BankMapping[1]["tabletype"],
            outputList: BankMapping[1]["outputColumn"],
            columnList: ["TRAN_DT", "GROUP_NM", "LIST_NM","werire"],
            dataList: [["11", "12", "13","14"], ["21", "22", "23","24"], ["31", "32", "33","34"]],
            columnMaxLength: columnMaxLength
        }

        var query = db_handle.insertQueryMapping(param);
        console.log(query);


    } catch (e) {
        console.log(e)
    }
}

testing2()()