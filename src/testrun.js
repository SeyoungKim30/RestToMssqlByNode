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

async function testing() {
    try {
        var insert_result;
        insert_result = await db_handle.insert_testing();
        console.log(insert_result)
      
        db_handle.pool_cloes(true, insert_result);

    } catch (e) {
        console.log(e)
    }
}


testing()