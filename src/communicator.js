require('dotenv').config();
const server_config = require('../config.json');
const db_handle = require('./dbHandle_mybatis.js')
const logger = require("./logger.js");
const oauth = require("./oauth.js")
const REQUEST_TIMEOUT_MS = 100000;
const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require('qs');

const express = require("express");
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function hasBearerToken(bearer_token) {
    return typeof bearer_token === "string" && bearer_token.trim().length > 0;
}

function getRecordCount(recordset) {
    return Array.isArray(recordset) ? recordset.length : 0;
}



async function axios_get(table_type, query_type, bearer_token) {
    /*
    query_type = insert or update
    */
    return new Promise(async function (resolve, reject) {
        try {
            var get_config = {
                headers: { Authorization: "Bearer " + bearer_token },
                "Content-Type": "application/x-www-form-urlencoded",
                timeout: REQUEST_TIMEOUT_MS,
            }
            var response = await axios.get(server_config.restlet_url + "&tabletype=" + table_type + "&type=" + query_type, get_config);  //response.data는 objects의 array
            resolve(response);
        } catch (e) {
            logger.error(`${table_type} fn axios_get :: queryType=${query_type} :: ` + e)
            reject(e);
        }
    })
}

async function put_request_to_ns(fn_name, put_data, bearer_token) {
    try {
        return new Promise(async function (resolve) {
            try {
                let put_config = {
                    method: "put",
                    maxBodyLength: Infinity,
                    timeout: REQUEST_TIMEOUT_MS,
                    url: server_config.restlet_url,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + bearer_token
                    },
                    data: JSON.stringify(put_data)
                };
                var put_response = await axios.request(put_config);
                if (put_response.data.type == "success") {
                    logger.info(`${put_data.table} fn ${fn_name} : put_request_to_ns success :: recordCount=${getRecordCount(put_data.recordset)}`);
                    resolve(true);
                } else {
                    logger.error(`${put_data.table} fn ${fn_name} : put_request_to_ns failed :: response=${JSON.stringify(put_response.data)} :: recordCount=${getRecordCount(put_data.recordset)}`);
                    resolve(false);
                }
            } catch (e) {
                logger.error(`${put_data.table} fn ${fn_name} : put_request_to_ns error :: ` + e);
                resolve(false);
            }
        })
    } catch (e) {
        logger.error(`${put_data.table} fn ${fn_name} : put_request_to_ns error :: ` + e);
        return false;
    }
}

function insert_request(table_type, bearer_token) {
    return new Promise(async function (resolve, reject) {
        try {
            var response = await axios_get(table_type, "insert", bearer_token);
            if (response.status == 200) {
                if (response.data.datalist.length > 0) {     //넣을거 있으면 insert 실행
                    var insert_result;
                    insert_result = await db_handle.insert_transfer(table_type, response.data);
                    var data = {};
                    if (insert_result.type == "success") {
                        data["recordset"] = insert_result.result.recordset;
                        data["type"] = "success";
                        data["table"] = table_type;
                        data["command"] = 'insert';
                        logger.info(`${table_type} fn insert_request : db insert success :: recordCount=${getRecordCount(insert_result.result.recordset)}`);
                    } else if (insert_result.type == "error") {
                        data["type"] = "error";
                        data["error"] = insert_result.error;
                        data["table"] = table_type;
                        data["recordset"] = response.data.datalist;      //받은거 insert 실패해서 다시 반환
                    }
                    if (insert_result.type == "error") {
                        logger.error(`${table_type} fn insert_request : db insert failed :: ` + insert_result.error);
                    }
                    var put_success = await put_request_to_ns('insert_request', data, bearer_token);
                    await db_handle.pool_cloes(put_success, insert_result);
                } else {
                    logger.info(`${table_type} fn insert_request :: nothing to insert.`)
                }
                resolve(true);
            } else {
                logger.error(`${table_type} fn insert_request : axios_get failed :: ` + JSON.stringify(response));
                reject(false)
            }
        } catch (e) {
            logger.error(`${table_type} fn insert_request :: ` + e);
            reject(e);
        }
    })
}

async function update_request(table_type, bearer_token) {
    return new Promise(async function (resolve, reject) {
        try {
            var get_response = await axios_get(table_type, "update", bearer_token);      //업데이트 필요한 레코드의 file name
            if (get_response.data.length <= 0) {
                logger.info(`${table_type} fn update_request :: nothing to update.`);
            } else {
                var select_db = await db_handle.update_transfer(table_type, get_response.data);
                if (select_db.result) {
                    if (select_db.result.recordset.length > 0) {
                        const put_data = { "type": "success", "table": table_type, "recordset": select_db.result.recordset, "command": "update" }
                        await put_request_to_ns('update_request', put_data, bearer_token)
                    }
                } else {
                    logger.warn(`${table_type} fn update_request :: update source exists but db select result is empty.`)
                }
            }
            resolve(true);
        } catch (e) {
            logger.error(`${table_type} fn update_request :: ` + e);
            reject(e);
        }
    })
}


async function import_transaction(tabletype, bearer_token) {
    return new Promise(async function (resolve, reject) {
        try {
            if (!hasBearerToken(bearer_token)) {
                logger.warn(`import_transaction : bearer token is missing. skip tabletype=${tabletype}`);
                resolve(false);
                return;
            }

            const db_result = await db_handle.select_importingTransaction(tabletype);
            if (db_result && db_result.type === "success" && db_result.result) {
                const recordCount = getRecordCount(db_result.result.recordset);
                if (recordCount <= 0) {
                    logger.info(`import_transaction : nothing to import :: tabletype=${tabletype}`);
                    resolve(true);
                    return;
                }

                const post_config = {
                    method: 'post',
                    maxBodyLength: Infinity,
                    timeout: REQUEST_TIMEOUT_MS,
                    url: server_config.SWK_RL_CMS_importTrsc,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + bearer_token
                    },
                    data: JSON.stringify({ type: "success", tabletype: tabletype, recordset: db_result.result.recordset })
                };
                try {
                    const post_result = await axios.request(post_config);
                    const nextStatus = post_result.data.type == "success"
                        ? db_handle.IMPORT_STATUS.SUCCESS
                        : db_handle.IMPORT_STATUS.FAILED;
                    const status_result = await db_handle.updateImportTransactionStatus(tabletype, db_result.result.recordset, nextStatus);

                    if (status_result.type !== "success") {
                        logger.error(`import_transaction : status update failed :: tabletype=${tabletype} :: status=${nextStatus} :: error=${status_result.error}`);
                    }

                    if (post_result.data.type == "success") {
                        logger.info(`import_transaction : post success :: tabletype=${tabletype} :: recordCount=${recordCount}`);
                    } else {
                        logger.error(`import_transaction : post failed :: tabletype=${tabletype} :: response=${JSON.stringify(post_result.data)} :: recordCount=${recordCount}`)
                    }
                } catch (postError) {
                    const status_result = await db_handle.updateImportTransactionStatus(tabletype, db_result.result.recordset, db_handle.IMPORT_STATUS.FAILED);
                    if (status_result.type !== "success") {
                        logger.error(`import_transaction : failed status update after post error :: tabletype=${tabletype} :: error=${status_result.error}`);
                    }
                    throw postError;
                }
            } else if (db_result && db_result.type === "error") {
                logger.error(`import_transaction : db select failed :: tabletype=${tabletype} :: error=${db_result.error}`);
                reject(new Error(db_result.error));
                return;
            } else {
                logger.warn(`import_transaction : db select result is empty :: tabletype=${tabletype}`);
            }
            resolve(true);
        } catch (e) {
            logger.error(`import_transaction :: tabletype=${tabletype} :: ` + String(e));
            reject(e);
        }
    })
}

async function run_ptcl() {       //이체 요청
    try {
        logger.audit('run_ptcl start : ' + new Date())
        var bearer_token = await oauth.get_access_token();
        if (!hasBearerToken(bearer_token)) {
            logger.warn('run_ptcl : access token unavailable. skip this cycle.');
            return false;
        }
        await update_request("1", bearer_token);
        await insert_request("1", bearer_token);
        logger.audit('run_ptcl end : ' + new Date())
    } catch (e) {
        logger.error('run_ptcl failed : ' + e)
    }
}

async function run_acct() {        //match bank를 위한 계좌내역 가져오기
    try {
        logger.audit('run_acct start : ' + new Date())
        var bearer_token = await oauth.get_access_token();
        if (!hasBearerToken(bearer_token)) {
            logger.warn('run_acct : access token unavailable. skip this cycle.');
            return false;
        }
        await import_transaction("5", bearer_token);
        await import_transaction("6", bearer_token);
        await import_transaction("7", bearer_token);
        logger.audit('run_acct end : ' + new Date())
    } catch (e) {
        logger.error('run_acct failed : ' + e)
    }
}

async function run_test() {
    try {
        logger.info('run_test start : ' + new Date())
        const bearer_token = await oauth.get_access_token();
        if (!hasBearerToken(bearer_token)) {
            logger.warn('run_test : access token unavailable. skip this cycle.');
            return false;
        }
        await import_transaction("7", bearer_token);
        logger.info('run_test end : ' + new Date())
    } catch (e) {
        logger.error('run_test failed : ' + e)
    }
}

module.exports = {
    run_ptcl,
    run_acct,
    run_test
}
