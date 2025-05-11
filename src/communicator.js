require('dotenv').config();
const server_config = require('../config.json');
const db_handle = require('./dbHandle_mybatis.js')
const logger = require("./logger.js");
const oauth = require("./oauth.js")

const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require('qs');

const express = require("express");
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



async function axios_get(table_type, query_type, bearer_token) {
    /*
    query_type = insert or update
    */
    try {
        var get_config = {
            headers: { Authorization: "Bearer " + bearer_token },
            "Content-Type": "application/x-www-form-urlencoded",
        }
        var response = await axios.get(server_config.restlet_url + "&tabletype=" + table_type + "&type=" + query_type, get_config);  //response.data는 objects의 array
        return response;
    } catch (e) {
        logger.error(`${table_type} fn axios_get :: ` + e)
    }
}

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

async function insert_request(table_type, bearer_token) {
    var response = await axios_get(table_type, "insert", bearer_token);
    if (response.status == 200) {
        logger.info(`fn insert_request : axios_get :: response success` + table_type)
        if (response.data.datalist.length > 0) {     //넣을거 있으면 insert 실행
            var insert_result;
            insert_result = await db_handle.insert_transfer(table_type, response.data);
            var data = {};
            if (insert_result.type == "success") {
                data["recordset"] = insert_result.result.recordset;
                data["type"] = "success"
                data["table"] = table_type
                data["command"] = 'insert'
                logger.info(`${table_type} fn insert_request : db_handle.insert_ : insert_result.type=success :: ` + JSON.stringify(insert_result.result))
            } else if (insert_result.type == "error") {
                data["type"] = "error"
                data["error"] = insert_result.error
                data["recordset"] = response.data;      //받은거 insert 실패해서 다시 반환
                logger.error(`fn insert_request : axios_get : db_handle.insert_ : insert_result.type=error :: ` + JSON.stringify(insert_result.error))
            }

            var put_success = await put_request_to_ns('insert_request', data, bearer_token);
            db_handle.pool_cloes(put_success, insert_result);
        } else {
            logger.info(`${table_type} fn insert_request :: NOTHING TO INSERT.`)
        }
    } else {
        logger.error(`fn insert_request : axios_get :: response fail` + JSON.stringify(response));
    }
}

async function update_request(table_type, bearer_token) {
    var get_response = await axios_get(table_type, "update", bearer_token);      //업데이트 필요한 레코드의 file name
    console.log(get_response.data)
    if (get_response.data.length <= 0) {
        logger.info(`${table_type} fn update_request :: NOTHING TO UPDATE :: NS_GET_RESPONSE=${JSON.stringify(get_response.data)}`);
        return;
    }
    var select_db = await db_handle.update_transfer(table_type, get_response.data);
    if (select_db.result.recordset.length > 0) {
        const put_data = { "type": "success", "table": table_type, "recordset": select_db.result.recordset, "command": "update" }
        await put_request_to_ns('update_request', put_data, bearer_token)
    } else {
        logger.info(`${table_type} fn update_request :: NOTHING TO UPDATE :: NS_GET_RESPONSE=${JSON.stringify(get_response.data)} :: SELECT_RESULT= ${JSON.stringify(select_db.result)}`)
    }
}


async function import_transaction(bearer_token) {
    const db_result = await db_handle.select_importingTransaction();
    //if(db_result.result){}
    const post_config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: server_config.SWK_RL_CMS_importTrsc,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + bearer_token
        },
        data: JSON.stringify({ type: "success", recordset: db_result.result.recordset })
    };
    const post_result = await axios.request(post_config)
    if (post_result.data.type == "success") {
        logger.info(`import_transaction : post_result :: ${JSON.stringify(post_result.data)} :: ${JSON.stringify(db_result.result.recordset)}`)
    } else {
        logger.error(`import_transaction : post_result :: ${JSON.stringify(post_result.data)} :: ${JSON.stringify(db_result.result)}`)
    }

}

async function run_ptcl() {       //이체 요청
    try {
        logger.info('run_ptcl : ' + new Date())
        var bearer_token = await oauth.get_access_token();
        await update_request("1", bearer_token);
        await insert_request("1", bearer_token);
    } catch (e) {
        logger.error('run_ptcl : ' + e)
    }
}

async function run_acct() {        //match bank를 위한 계좌내역 가져오기
    try {
        var bearer_token = await oauth.get_access_token();
        import_transaction(bearer_token);
    } catch (e) {
        logger.error(e)
    }
}

async function run_test() {
    try {
        const bearer_token = await oauth.get_access_token();
        insert_request("1", bearer_token)
    } catch (e) {
        logger.error(e)
    }
}



module.exports = {
    run_ptcl,
    run_acct,
    run_test
}