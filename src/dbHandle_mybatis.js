require('dotenv').config();
const logger = require("./logger.js");
const server_config = require('../config.json');
const sql = require('mssql');
const mybatisMapper = require('mybatis-mapper');  //매핑할 마이바티스
const BankMapping = require(`../bankmapping/${server_config.bank}.json`)
const IMPORT_RETRY_MINUTES = Number(process.env.NS_STATUS_RETRY_MINUTES || 10);

function createPool() {
    return new sql.ConnectionPool({
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
}

let pool = createPool();
let poolConnectPromise = null;

async function getPool() {
    if (pool.connected) {
        return pool;
    }

    if (!poolConnectPromise) {
        poolConnectPromise = pool.connect()
            .then((connectedPool) => connectedPool)
            .catch((err) => {
                poolConnectPromise = null;
                throw err;
            });
    }

    return poolConnectPromise;
}

async function closePool() {
    try {
        if (pool.connected || pool.connecting || poolConnectPromise) {
            await pool.close();
            logger.warn("pool closed");
        }
    } catch (e) {
        logger.error(`DB : closePool :: ${JSON.stringify(e)}`);
    } finally {
        poolConnectPromise = null;
        pool = createPool();
    }
}

async function executeQuery(querystring) {
    try {
        const connectedPool = await getPool();
        var result = { "type": "success", "result": await connectedPool.query(querystring) };
    } catch (err) {
        var result = { "type": "error", "error": err.message };
    }
    return result;
}

function executeQuery_noclose(querystring) {
    return new Promise(async function (resolve, reject) {
        let transaction;
        try {
            const connectedPool = await getPool();
            // 트랜잭션 시작
            transaction = new sql.Transaction(connectedPool);
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
    }
}

const IMPORT_STATUS = {
    SENDING: "sending",
    SUCCESS: "success",
    FAILED: "failed"
};
async function select_importingTransaction(tabletype) {
    try {
        mybatisMapper.createMapper(['./src/mapper1.xml']);

        // SQL Parameters
        var param = {
            table_importtrsc: BankMapping["tabletype"][tabletype],
            statusSending: IMPORT_STATUS.SENDING,
            statusFailed: IMPORT_STATUS.FAILED,
            retryMinutes: IMPORT_RETRY_MINUTES
        }
        // Get SQL Statement
        var format = { language: 'sql' };
        var query = mybatisMapper.getStatement('mapper1', 'select_importtrsc', param, format);
        var result = await executeQuery(query);
        return result;
    } catch (e) {
        logger.error("select_importingTransaction" + JSON.stringify(e))
        return { "type": "error", "error": e.message || String(e) };
    }
}

async function getPrimaryKeyColumns(tableName) {
    const query = `
        SELECT ku.COLUMN_NAME
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku
            ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
           AND tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
           AND tc.TABLE_NAME = ku.TABLE_NAME
        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
          AND tc.TABLE_SCHEMA = 'dbo'
          AND tc.TABLE_NAME = '${tableName}'
        ORDER BY ku.ORDINAL_POSITION;
    `;
    const result = await executeQuery(query);
    if (result.type !== "success" || !result.result) {
        throw new Error(`failed to load primary key columns for ${tableName}`);
    }
    return result.result.recordset.map((row) => row.COLUMN_NAME);
}

function toSqlLiteral(value) {
    if (value === null || value === undefined) {
        return "NULL";
    }

    if (value instanceof Date) {
        return `CAST('${value.toISOString().replace('T', ' ').replace('Z', '')}' AS DATETIME2)`;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? String(value) : "NULL";
    }

    if (typeof value === "boolean") {
        return value ? "1" : "0";
    }

    return `N'${String(value).replace(/'/g, "''")}'`;
}

function buildPrimaryKeyCondition(row, primaryKeyColumns) {
    return primaryKeyColumns.map((column) => {
        const value = row[column];
        if (value === null || value === undefined) {
            return `[${column}] IS NULL`;
        }
        return `[${column}] = ${toSqlLiteral(value)}`;
    }).join(" AND ");
}

async function updateImportTransactionStatus(tabletype, rows, status) {
    try {
        if (!Array.isArray(rows) || rows.length <= 0) {
            return { type: "success", result: { rowsAffected: [0] } };
        }

        const tableName = BankMapping["tabletype"][tabletype];
        const primaryKeyColumns = await getPrimaryKeyColumns(tableName);
        if (primaryKeyColumns.length <= 0) {
            throw new Error(`primary key not found for ${tableName}`);
        }

        const whereClause = rows
            .map((row) => `(${buildPrimaryKeyCondition(row, primaryKeyColumns)})`)
            .join(" OR ");

        const query = `
            UPDATE dbo.${tableName}
            SET NS_STATUS = ${toSqlLiteral(status)},
                NS_INTFC = GETDATE()
            WHERE ${whereClause};
        `;
        logger.info(`DB : updateImportTransactionStatus :: query :: ${query}`)
        const result = await executeQuery(query);
        if (result.type === "success" && result.result) {
            const rowsAffected = Array.isArray(result.result.rowsAffected)
                ? result.result.rowsAffected.reduce((sum, count) => sum + count, 0)
                : 0;
            if (rowsAffected === 0) {
                logger.error(`DB : updateImportTransactionStatus :: no rows updated :: table=${tableName} :: status=${status} :: selectedRows=${rows.length}`);
            } else if (rowsAffected !== rows.length) {
                logger.error(`DB : updateImportTransactionStatus :: rows updated mismatch :: table=${tableName} :: status=${status} :: selectedRows=${rows.length} :: updatedRows=${rowsAffected}`);
            }
        }
        return result;
    } catch (e) {
        logger.error(`DB : updateImportTransactionStatus :: ${JSON.stringify(e)}`);
        return { type: "error", "error": e.message };
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
            reject({ "type": "error", "error": JSON.stringify(e), "transaction": null });
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
    return new Promise(async function (resolve, reject) {
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
            reject(e);
        }
    })
}


module.exports = {
    select_importingTransaction,
    insert_transfer,
    update_transfer,
    updateImportTransactionStatus,
    pool_cloes,
    closePool,
    insertQueryMapping,
    IMPORT_STATUS
}
