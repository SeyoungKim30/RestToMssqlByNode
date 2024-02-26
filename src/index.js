const server_config = require('../config.json');
const db_handle = require('./db_handle.js')

const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require('qs');

const express = require("express");
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


async function get_access_token() {
    let data = qs.stringify({
        'refresh_token': server_config.refresh_token,
        'redirect_uri': server_config.redirect_uri,
        'grant_type': 'refresh_token'
    });

    let token_config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: server_config.oauth2_url,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + server_config.basic_authorization
        },
        data: data
    };
    let response = await axios.request(token_config);
    return response.data.access_token;
}

async function get_request() {
    var bearer_token = await get_access_token();
    var get_config = {
        headers: {
            Authorization:
                "Bearer " + bearer_token,
        },
        "Content-Type": "application/x-www-form-urlencoded",
    }

    var response = await axios.get(server_config.restlet_get_url, get_config);  //response.data는 objects의 array
    if (response.data.length > 0) {     //넣을거 있으면 insert 실행
        console.log(`typeof(response.data): `+typeof(response.data)+" : "+response.data)
        db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL(response.data);
    }
}

get_request();