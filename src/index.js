const server_config = require('../config.json');

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
        url: 'https://tstdrv1278203.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic MjFhMTU5OWY2ZjA1MTlkNTBmYWJiODNkNGJmODMzMjMyMGQyODM0ZmY5MzAyMWE1NTYwYmE1Mzc5NjE3ZDRjMDowMTdmNjk5ZGJhNDViZTQxYjNkZjc3ZDdlZDU0M2FlOTJiMjc5YTdkZDg1YjE1YjYwYTgyM2JkMjEwZDk5Mzll'
        },
        data: data
    };
    let response = await axios.request(token_config);
    return response.data.access_token;
}

async function get_request() {
    var bearer_token = await get_access_token();
    console.log("bearer_token is " + bearer_token)
    var get_config = {
        headers: {
            Authorization:
                "Bearer " + bearer_token,
        },
        "Content-Type": "application/x-www-form-urlencoded",
    }

    var response = await axios.get(server_config.restlet_get_url, get_config);
    console.log(JSON.stringify(response.data));
}

get_request();