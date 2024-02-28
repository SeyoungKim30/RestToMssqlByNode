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

async function axios_get(table_type, query_type,bearer_token) {
    var get_config = {
        headers: { Authorization: "Bearer " + bearer_token },
        "Content-Type": "application/x-www-form-urlencoded",
    }
    var response = await axios.get(server_config.restlet_get_url + "&tabletype=" + table_type + "&type=" + query_type, get_config);  //response.data는 objects의 array
    return response;
}

async function insert_request(table_type) {
    var bearer_token = await get_access_token();
    var response = await axios_get(table_type, "insert",bearer_token);
    console.log("GET response : " + response)
    if (response.data.length > 0) {     //넣을거 있으면 insert 실행
        /* 
         if (table_type == "HCMS_E2C_EVLM_TRNS_PTCL") {
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
  */
        if (table_type == "HCMS_E2C_EVLM_TRNS_PTCL") {
            db_handle.insert_HCMS_E2C_EVLM_TRNS_PTCL(response.data).then((insert_result) => {
                var data = {};
                if (insert_result.type == "success") {
                    data["recordset"] = insert_result.result.recordset;
                    data["type"] = "success"
                } else {
                    data = insert_result;
                    data["recordset"] = response.data;
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
                    data: JSON.stringify(data)
                };
                return axios.request(put_config)
            }).then((response) => {
                console.log(JSON.stringify(response.data));
            }).catch((error) => {
                console.log(error);
            });
        }

    }
}

async function update_request(table_type) {
    var bearer_token = await get_access_token();
    var response = await axios_get(table_type, "update",bearer_token);      //업데이트 필요한 레코드의 file name
    console.log("update req : reponse.data",response.data)
    if (response.data.length > 0) {
        if (table_type == "HCMS_E2C_EVLM_TRNS_PTCL") {
            db_handle.select_HCMS_E2C_EVLM_TRNS_PTCL(response.data).then((result)=>{
                console.log("select result : "+result)
                //post로 반환해서 update
                const post_config = {
                    method: 'post',
                    maxBodyLength: Infinity,
                    url: 'https://tstdrv1278203.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=2522&deploy=1',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + bearer_token
                    },
                    data: JSON.stringify(result)
                };
                return axios.request(post_config);
            })

        }
    }
}


//insert_request("HCMS_E2C_EVLM_TRNS_PTCL");
update_request("HCMS_E2C_EVLM_TRNS_PTCL");