require('dotenv').config();
const server_config = require('../config.json');
const db_handle = require('./db_handle.js')
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
    } else {
        logger.error(`${put_data.table} fn ${fn_name} : put_request_to_ns :: ${JSON.stringify(put_response.data)} :: ${JSON.stringify(put_data)}`);
    }
}

async function insert_request(table_type, bearer_token) {
    var response = await axios_get(table_type, "insert", bearer_token);
    logger.http(`${table_type} fn insert_request : axios_get :: ` + response)
    if (response.data.length > 0) {     //넣을거 있으면 insert 실행
        var insert_result;
        switch (table_type) {
            case "HCMS_E2C_EVLM_TRNS_PTCL": insert_result = await db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL(response.data); break;
            case "HCMS_E2C_DMST_REMT_PTCL": insert_result = await db_handle.insert_HCMS_E2C_DMST_REMT_PTCL(response.data); break;
            case "HCMS_E2C_OVRS_REMT_PTCL": insert_result = await db_handle.insert_HCMS_E2C_OVRS_REMT_PTCL(response.data); break;
        }
        var data = {};
        if (insert_result.type == "success") {
            data["recordset"] = insert_result.result.recordset;
            data["type"] = "success"
            data["table"] = table_type
            logger.info(`${table_type} fn insert_request : db_handle.insert_ : insert_result.type=success :: ` + JSON.stringify(insert_result))
        } else if (insert_result.type == "error") {
            data = insert_result;
            data["recordset"] = response.data;      //받은거 insert 실패해서 다시 반환
            logger.warn(`${table_type} fn insert_request : axios_get : db_handle.insert_ : insert_result.type=error :: ` + JSON.stringify(insert_result))
        }
        await put_request_to_ns('insert_request', data, bearer_token);

    } else {
        logger.info(`${table_type} fn insert_request :: NOTHING TO INSERT.`)
    }
}

async function update_request(table_type, bearer_token) {
    var get_response = await axios_get(table_type, "update", bearer_token);      //업데이트 필요한 레코드의 file name
    if (get_response.data.length <= 0) {
        logger.info(`${table_type} fn update_request :: NOTHING TO UPDATE :: NS_GET_RESPONSE=${JSON.stringify(get_response.data)}`);
        return;
    }
    var select_db;
    switch (table_type) {
        case "HCMS_E2C_EVLM_TRNS_PTCL": select_db = await db_handle.select_HCMS_E2C_EVLM_TRNS_PTCL_to_update(get_response.data); break;
        case "HCMS_E2C_DMST_REMT_PTCL": select_db = await db_handle.select_HCMS_E2C_DMST_REMT_PTCL_to_update(get_response.data); break;
        case "HCMS_E2C_OVRS_REMT_PTCL": select_db = await db_handle.select_HCMS_E2C_OVRS_REMT_PTCL_to_update(get_response.data); break;
    }
    if (select_db.result.recordset.length > 0) {
        const put_data = { "type": "success", "table": table_type, "recordset": select_db.result.recordset }
        await put_request_to_ns('update_request', put_data, bearer_token)
    } else {
        logger.info(`${table_type} fn update_request :: NOTHING TO UPDATE :: NS_GET_RESPONSE=${JSON.stringify(get_response.data)} :: SELECT_RESULT= ${JSON.stringify(select_db.result)}`)
    }
}


async function interface_HCMS_ACCT_TRSC_PTCL(bearer_token) {
    const db_result = await db_handle.select_HCMS_ACCT_TRSC_PTCL();
    //if(db_result.result){}
    const post_config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: server_config.restlet_HCMS_ACCT_TRSC_PTCL_url,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + bearer_token
        },
        data: JSON.stringify({ type: "success", recordset: db_result.result.recordset })
    };
    const post_result = await axios.request(post_config)
    if (post_result.data.type == "success") {
        logger.info(`HCMS_ACCT_TRSC_PTCL fn interface_ : post_result :: ${JSON.stringify(post_result.data)} :: ${JSON.stringify(db_result.result.recordset)}`)
    } else {
        logger.error(`HCMS_ACCT_TRSC_PTCL fn interface_ : post_result :: ${JSON.stringify(post_result.data)} :: ${JSON.stringify(db_result.result)}`)
    }

}

async function run_ptcl() {       //이체 요청
    try {
        console.log('RUN : ' + new Date())
        var bearer_token = await oauth.get_access_token();
        insert_request("HCMS_E2C_EVLM_TRNS_PTCL", bearer_token);
        update_request("HCMS_E2C_EVLM_TRNS_PTCL", bearer_token);
        //insert_request("HCMS_E2C_DMST_REMT_PTCL", bearer_token);
        //update_request("HCMS_E2C_DMST_REMT_PTCL", bearer_token);
        insert_request("HCMS_E2C_OVRS_REMT_PTCL", bearer_token);
        update_request("HCMS_E2C_OVRS_REMT_PTCL", bearer_token);
    } catch (e) {
        logger.error('run_ptcl : ' + e)
    }
}

async function run_acct() {        //match bank를 위한 계좌내역 가져오기
    try {
        var bearer_token = await oauth.get_access_token();
        interface_HCMS_ACCT_TRSC_PTCL(bearer_token);
    } catch (e) {
        logger.error(e)
    }
}

module.exports = {
    run_ptcl,
    run_acct
}