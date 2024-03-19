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

async function put_request_to_ns(table_type, fn_name, put_data, bearer_token) {
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
        logger.info(`${table_type} fn ${fn_name} : put_request_to_ns :: ${JSON.stringify(put_response.data)} :: ${JSON.stringify(put_data)}`);
    } else {
        logger.error(`${table_type} fn ${fn_name} : put_request_to_ns :: ${JSON.stringify(put_response.data)} :: ${JSON.stringify(put_data)}`);
    }
}

async function insert_request(table_type) {
    var bearer_token = await oauth.get_access_token();
    var response = await axios_get(table_type, "insert", bearer_token);
    logger.http(`${table_type} fn insert_request : axios_get :: ` + response)
    if (response.data.length > 0) {     //넣을거 있으면 insert 실행
        if (table_type == "HCMS_E2C_EVLM_TRNS_PTCL") {
            const insert_result = await db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL(response.data);
            var data = {};
            if (insert_result.type == "success") {
                data["recordset"] = insert_result.result.recordset;
                data["type"] = "success"
                logger.info(`${table_type} fn insert_request : db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL : insert_result.type=success :: ` + JSON.stringify(insert_result))
            } else if (insert_result.type == "error") {
                data = insert_result;
                data["recordset"] = response.data;      //받은거 insert 실패해서 다시 반환
                logger.warn(`${table_type} fn insert_request : axios_get : db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL : insert_result.type=error :: ` + JSON.stringify(insert_result))
            }
            await put_request_to_ns(table_type, 'insert_request', data, bearer_token);
        }
    } else {
        logger.info(`${table_type} fn insert_request :: NOTHING TO INSERT.`)
    }
}

async function update_request(table_type) {
    var bearer_token = await oauth.get_access_token();
    var get_response = await axios_get(table_type, "update", bearer_token);      //업데이트 필요한 레코드의 file name

    async function selectFromDBTable(table_type, data) {
        switch (table_type) {
            case "HCMS_E2C_EVLM_TRNS_PTCL":
                return await db_handle.select_HCMS_E2C_EVLM_TRNS_PTCL_to_update(data);
            case "다른테이블":
                return "다른 db select 함수"
        }
    }
    if (get_response.data.length > 0) {
        var select_db = await selectFromDBTable("HCMS_E2C_EVLM_TRNS_PTCL", get_response.data);
        const put_data = { "type": "success", "recordset": select_db.result.recordset }
        if (select_db.result.recordset.length > 0) {
            await put_request_to_ns(table_type, 'update_request', put_data, bearer_token)
        } else {
            logger.info(`${table_type} fn update_request :: NOTHING TO UPDATE :: NS_GET_RESPONSE=${JSON.stringify(get_response.data)} :: SELECT_RESULT= ${JSON.stringify(select_db.result)}`)
        }
    } else {
        logger.info(`${table_type} fn update_request :: NOTHING TO UPDATE :: NS_GET_RESPONSE=${JSON.stringify(get_response.data)} :: SELECT_RESULT= no result `)
    }
}

async function interface_HCMS_ACCT_TRSC_PTCL() {
    const bearer_token = await oauth.get_access_token();
    const db_result = await db_handle.select_HCMS_ACCT_TRSC_PTCL();
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

//insert_request("HCMS_E2C_EVLM_TRNS_PTCL");
//update_request("HCMS_E2C_EVLM_TRNS_PTCL");
//interface_HCMS_ACCT_TRSC_PTCL();

function run() {
    console.log('RUN : '+new Date() )
    insert_request("HCMS_E2C_EVLM_TRNS_PTCL");
    update_request("HCMS_E2C_EVLM_TRNS_PTCL");
    interface_HCMS_ACCT_TRSC_PTCL();

}

setInterval(run, 60 * 1000 * server_config.run_every_minutes);