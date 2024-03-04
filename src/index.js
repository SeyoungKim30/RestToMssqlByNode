require('dotenv').config();
const server_config = require('../config.json');
const db_handle = require('./db_handle.js')
const logger = require("./logger.js");

const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require('qs');

const express = require("express");
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


async function get_access_token() {
    try {
        let data = qs.stringify({
            'refresh_token': process.env.refresh_token,
            'redirect_uri': server_config.redirect_uri,
            'grant_type': 'refresh_token'
        });

        let token_config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: server_config.oauth2_url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + process.env.basic_authorization
            },
            data: data
        };
        let response = await axios.request(token_config);
        logger.http(`fn get_access_token :: ` + response)
        return response.data.access_token;
    } catch (e) {
        logger.error("fn get_access_token :: " + e)
    }
}

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

async function insert_request(table_type) {
    var bearer_token = await get_access_token();
    var response = await axios_get(table_type, "insert", bearer_token);
    logger.http(`${table_type} fn insert_request : axios_get :: ` + response)
    if (response.data.length > 0) {     //넣을거 있으면 insert 실행
        if (table_type == "HCMS_E2C_EVLM_TRNS_PTCL") {
            db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL(response.data).then((insert_result) => {
                var data = {};
                if (insert_result.type == "success") {
                    data["recordset"] = insert_result.result.recordset;
                    data["type"] = "success"
                    logger.info(`${table_type} fn insert_request : db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL : insert_result.type=success :: ` + JSON.stringify(insert_result))
                } else if (insert_result.type == "error") {
                    data = insert_result;
                    data["recordset"] = response.data;      //받은거 insert 실패해서 다시 반환
                    logger.warn(`${table_type} fn insert_request : axios_get : db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL : insert_result.type=error :: ` + insert_result)
                }
                //put으로 result 보내기
                let put_config = {
                    method: 'put',
                    maxBodyLength: Infinity,
                    url: server_config.restlet_url,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + bearer_token
                    },
                    data: JSON.stringify(data)
                };
                return axios.request(put_config)
            }).then((response) => {
                logger.info(`${table_type} fn insert_request : put request to NS :: ` + response)
            }).catch((error) => {
                logger.error(`${table_type} fn insert_request : db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL :: ` + error)
            });
        }
    } else {
        logger.info(`${table_type} fn insert_request :: NOTHING TO INSERT.`)
    }
}

async function update_request(table_type) {
    var bearer_token = await get_access_token();
    var get_response = await axios_get(table_type, "update", bearer_token);      //업데이트 필요한 레코드의 file name
    if (get_response.data.length > 0) {
        if (table_type == "HCMS_E2C_EVLM_TRNS_PTCL") {
            /* db_handle.select_HCMS_E2C_EVLM_TRNS_PTCL(get_response.data).then((result) => {
                 //post로 반환해서 update
                 const post_config = {
                     method: 'post',
                     maxBodyLength: Infinity,
                     url: server_config.restlet_url,
                     headers: {
                         'Content-Type': 'application/json',
                         'Authorization': 'Bearer ' + bearer_token
                     },
                     data: JSON.stringify(result)
                 };
                 return axios.request(post_config);
             })*/
            const select_db = await db_handle.select_HCMS_E2C_EVLM_TRNS_PTCL(get_response.data);
            const post_config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: server_config.restlet_url ,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + bearer_token
                },
                data: JSON.stringify(select_db)
            };
            var post_response = await axios.request(post_config);
            if (post_response.data.type == "success") {
                logger.info(`${table_type} fn update_request :: ${JSON.stringify(post_response.data)} :: ${JSON.stringify(select_db)}`);
            } else {
                logger.error(`${table_type} fn update_request :: ${JSON.stringify(post_response.data)} :: ${JSON.stringify(select_db)}`);
            }
        }
    } else {
        logger.info(`${table_type} fn update_request :: NOTHING TO UPDATE `)
    }
}


insert_request("HCMS_E2C_EVLM_TRNS_PTCL");
//update_request("HCMS_E2C_EVLM_TRNS_PTCL");

/*
setInterval(function () {
    insert_request("HCMS_E2C_EVLM_TRNS_PTCL");
}, 60 * 1000 * server_config.run_every_minutes);
*/