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

function executeQuery_noclose(querystring) {
    return new Promise(async function (resolve, reject) {
        let transaction;
        try {
            await pool.connect();
            // 트랜잭션 시작
            transaction = new sql.Transaction(pool);
            await transaction.begin();

            // 쿼리 실행
            const request = new sql.Request(transaction);
            const result = await request.query(querystring);
            resolve({ "type": "success", "result": result, "transaction": transaction });

        } catch (err) {
            // 오류 발생 시 롤백
            if (transaction) {
                await transaction.rollback();
            }
            logger.error(`DB : executeQuery :: ${err.message} :: ${querystring}`);
            reject({ "type": "error", "error": err.message, "transaction": transaction });
        }
    })
}

async function pool_cloes(put_result, insert_result) {
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
        logger.warn("pool closed")
    }
}

async function select_importingTransaction(tabletype) {
    try {
        mybatisMapper.createMapper(['./src/mapper1.xml']);

        // SQL Parameters
        var param = { table_importtrsc: BankMapping["tabletype"][tabletype] }
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
    return new Promise(async function (resolve, reject) {
        /**
         * {
         * columnlist: [
         * 'TRAN_DT','TRAN_DT_SEQ','TRAN_REMITTEE_NM','TRAN_JI_ACCT_NB','TRAN_CMS_CD','TRAN_AMT_REQ','TRAN_IP_BANK_ID','TRAN_IP_ACCT_NB','TRAN_REMITTEE_REALNM','TRAN_IP_NAEYONG','TRAN_JI_NAEYONG','GROUP_NM','LIST_NM'  ],
         * datalist: [
         * ['2025-05-01','1','4935','0271574035600015','','10000','218','234234242','','입금통장표시내역','출금통장표시내역','202505test - 과거전표','202505test - 과거전표']
         * ]
         * }
         */
        try {
            var columnMaxLength = (await executeQuery(`SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${BankMapping[tabletype]["tabletype"]}';`)).result.recordset;
            var param = {
                tableName: BankMapping[tabletype]["tabletype"],
                columnList: data.columnlist,
                dataList: data.datalist,
                columnMaxLength: columnMaxLength
            }
            var query = await insertQueryMapping(param);
            var result = await executeQuery_noclose(query);
            resolve(result);
        } catch (e) {
            logger.error(`DB : insert_transfer :: ${JSON.stringify(e)}`);
            reject({ "type": "error", "error": JSON.stringify(e), "transaction": transaction });
        }
    })
}

function insertQueryMapping(param) {
    return new Promise(function (resolve) {
        try {
            var columnNameLength = [];
            var query = `insert into dbo.${param.tableName} (`;
            var outputQuery = ``;

            for (eachColNameIndex in param.columnList) {
                let columnMaxLengthObject = (param.columnMaxLength).filter((each) => each.COLUMN_NAME == param.columnList[eachColNameIndex])
                if (columnMaxLengthObject != null) {
                    columnNameLength[eachColNameIndex] = columnMaxLengthObject[0];
                } else {
                    columnNameLength[eachColNameIndex] = { COLUMN_NAME: param.columnList[eachColNameIndex], CHARACTER_MAXIMUM_LENGTH: null }
                }
                query = query + param.columnList[eachColNameIndex];
                outputQuery = outputQuery + ` inserted.${param.columnList[eachColNameIndex]}`;
                if ((param.columnList).length > Number(eachColNameIndex) + 1) {
                    query = query + `, `;
                    outputQuery = outputQuery + `, `;
                }
            }

            query = query + `) OUTPUT ` + outputQuery + ` VALUES `

            for (var dataObjectindex in param.dataList) {
                query = query + `( `
                var singleRow = param.dataList[dataObjectindex];
                for (var columnIndex in singleRow) {
                    if (singleRow[columnIndex] != "" && singleRow[columnIndex] != "null" && singleRow[columnIndex] != null) {
                        const MaxLength = columnNameLength[columnIndex].CHARACTER_MAXIMUM_LENGTH;
                        if (MaxLength) {
                            query = query + `
                        CASE WHEN LEN('${singleRow[columnIndex]}') = DATALENGTH('${singleRow[columnIndex]}') 
                        THEN LEFT('${singleRow[columnIndex]}', ${columnNameLength[columnIndex].CHARACTER_MAXIMUM_LENGTH})
                        ELSE LEFT('${singleRow[columnIndex]}', ${(columnNameLength[columnIndex].CHARACTER_MAXIMUM_LENGTH) / 2}) END `;
                        } else {
                            query = query + `'` + singleRow[columnIndex] + `'`
                        }
                    } else {
                        query = query + `null`;
                    }
                    if (singleRow.length > (Number(columnIndex) + 1)) { query = query + `,`; }
                }
                query = query + `)`
                if ((param.dataList).length > (Number(dataObjectindex) + 1)) { query = query + `,` }
            }
            resolve(query);
        } catch (e) {
            logger.error(e)
        }
    })
}

function update_transfer(tabletype, data) {
    return new Promise(async function (resolve) {
        try {
            mybatisMapper.createMapper(['./src/mapper1.xml']);
            var param = {
                tableName: BankMapping[tabletype]["tabletype"],
                fileNameColumn: BankMapping[tabletype]["fileNameColumn"],
                fileName: data,
                columnList: BankMapping[tabletype]["updateColumn"]
            }
            var query = mybatisMapper.getStatement('mapper1', 'update1', param, { language: 'sql' });
            var result = await executeQuery(query);
            resolve(result);
        } catch (e) {
            logger.error(`DB : update_transfer :: ${JSON.stringify(e)}`);
            reject();
        }
    })
}


module.exports = {
    select_importingTransaction,
    insert_transfer,
    update_transfer,
    pool_cloes,
    insertQueryMapping
}