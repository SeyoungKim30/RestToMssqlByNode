const server_config = require('../config.json');

const bodyParser = require("body-parser");
const axios = require("axios");
const qs = require('qs');

const express = require("express");
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function get_access_token() {
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
    axios.request(token_config)
        .then((response) => {
            return response.data.access_token
        })
        .catch((error) => {
            console.log(error);
        });
}

function get_request() {
    var bearer_token = get_request();
    console.log("bearer_token is " + bearer_token)
    var get_config = {
        headers: {
            Authorization:
                "Bearer " + "eyJraWQiOiJjLlRTVERSVjEyNzgyMDMuMjAyNC0wMS0xMF8wMC0xMS0zNSIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIzOzQ4MjMiLCJhdWQiOlsiNDg4MUI5NTgtMzdCOC00MzUzLThBQTctQkNGODRBNTM3QkM5O1RTVERSVjEyNzgyMDMiLCIyMWExNTk5ZjZmMDUxOWQ1MGZhYmI4M2Q0YmY4MzMyMzIwZDI4MzRmZjkzMDIxYTU1NjBiYTUzNzk2MTdkNGMwIl0sInNjb3BlIjpbInJlc3RsZXRzIl0sImlzcyI6Imh0dHBzOi8vc3lzdGVtLm5ldHN1aXRlLmNvbSIsIm9pdCI6MTcwODI0NzkwNiwiZXhwIjoxNzA4NTk3NDA4LCJpYXQiOjE3MDg1OTM4MDgsImp0aSI6IlRTVERSVjEyNzgyMDMuYS1hLmYzNDQ1MWMzLTk0MTQtNDE1Zi1iYjIyLTVkM2Y1ZjA5YmZkMF8xNzA4MjQ3OTA2OTc4LjE3MDg1OTM4MDgzNDYifQ.E_Um3FVPt3vuJpWtgJmcBQ8IbqRlKCKAuGgkMzjYPkPMykWt7VU4ydDVzey7ybzlDV5tAlxo-zqJoFNlOzy6t3Fd6XVFed-TcAZ5g-RPWdukXbFyOFXfNgSzSTOkWg4GoHZ2PFfCTcwcG40ArMrW3HPoTTYd8sozJUclvIlpzHcXnx-Qdfl7SXZ7aigvgxJkOifUu5n7FVUuEqMTZdpmN6SGCyGyqjLxJ_-incc_2HUDRh2SaA6Iw3XitLZn8fPD3deLXA4ZEaCrzUKMKR2R9dzFuMIiw4a_9sgz4JhTwzDjOZpZ1pDyOb38y9FPJXLM8p4fRZQ6nW4t9EF2g5j438ncifxgi0O_Xcp9f5MJBWaAwmZRmKLUUU5P5ZpAzqonayTY2_XBlr3rhGVpub3T0kYb6-94eZcraGGiq43cnURqOraEncY3IOA0LDu6XkU52Mcl0lLjNTWZi0xVONTM-MAAh_JsoTCtvZPzBCMxzZ4rVtK0V7IorqP8Q-o-CYN-4aL7NeY80HTp3482jkRV46JtS8pDHy55NC7JI3ACcIdeyJoCoDSArKEo9f4MGVaYzec7TOWHc22zij7hP5oVGi0FHPVQzQDqWaDM7f6GrRm4Pdi81kyLHoSlwkpjm0CD_6Vgq95ahQJlaICWrL8eYlSF15lav-NUtj7oUYbfRKc",
        },
        "Content-Type": "application/x-www-form-urlencoded",
    }
    // var get_param = new URLSearchParams({ script: "2520", deploy: "1", message: "from axios", })
    var response = axios.get(server_config.restlet_get_url, get_config);
    console.log(response.data);
}