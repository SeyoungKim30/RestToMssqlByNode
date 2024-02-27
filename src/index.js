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

async function insert_request(tabletypename) {
    var bearer_token = await get_access_token();
    var get_config = {
        headers: { Authorization: "Bearer " + bearer_token },
        "Content-Type": "application/x-www-form-urlencoded",
    }
    var response = await axios.get(server_config.restlet_get_url + "&tabletype=" + tabletypename, get_config);  //response.data는 objects의 array

    if (response.data.length > 0) {     //넣을거 있으면 insert 실행
        if (tabletypename == "HCMS_E2C_EVLM_TRNS_PTCL") {
            var insert_result = await db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL(response.data);
        }
        if(insert_result.type == "success"){
            var data = JSON.stringify(insert_result.result.recordset);
        }else{
            var data = insert_result.result;
            data[recordset]=response.data

        }
        //put으로 result 보내기
        let put_config = {
            method: 'put',
            maxBodyLength: Infinity,
            url: 'https://tstdrv1278203.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=2522&deploy=1',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + bearer_token
            },
            data: data
        };

        axios.request(put_config)
            .then((response) => {
                console.log(JSON.stringify(response.data));
            })
            .catch((error) => {
                console.log(error);
            });



    }
}

insert_request("HCMS_E2C_EVLM_TRNS_PTCL");