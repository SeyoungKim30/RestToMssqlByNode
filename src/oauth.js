const axios = require("axios");
const cryptojs = require('crypto-js'); // using crypto js for base64 encoding
const qs = require('qs');
const fs = require('fs');

const logger = require("./logger.js");
const server_config = require('../config.json');
require('dotenv').config();


async function get_access_token() {
    try {
        let jsrsasign_config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://kjur.github.io/jsrsasign/jsrsasign-latest-all-min.js',
            headers: {}
        };

        let jsrsasign_response = await axios.request(jsrsasign_config);
        var navigator = {}; // necessary as part of "eval" on jsrsasign lib
        var window = {}; // necessary as part of "eval" on jsrsasign lib
        eval(jsrsasign_response.data);

        var jwtHeader = {
            alg: 'PS256', // Using PS256, which is one of the algorithms NetSuite supports for client credentials
            typ: 'JWT',
            kid: process.env.NS_CREDENTIAL_CERT_ID // Certificate Id on the client credentials mapping
        };
        let stringifiedJwtHeader = JSON.stringify(jwtHeader);

        // Create JWT payload
        let jwtPayload = {
            iss: process.env.NS_INTEGRATION_CONSUMER_KEY, // consumer key of integration record
            scope: ['restlets', 'rest_webservices'], // scopes specified on integration record
            iat: (new Date() / 1000),               // timestamp in seconds
            exp: (new Date() / 1000) + 3600,        // timestamp in seconds, 1 hour later, which is max for expiration
            aud: server_config.oauth2_url
        };

        var stringifiedJwtPayload = JSON.stringify(jwtPayload);

        // The secret is the private key of the certificate loaded into the client credentials mapping in NetSuite
        let secret = fs.readFileSync('certification/'+process.env.CERTIFICATION_FILENAME, 'utf8');
        let encodedSecret = cryptojs.enc.Base64.stringify(cryptojs.enc.Utf8.parse(secret)); // we need to base64 encode the key

        // Sign the JWT with the PS256 algorithm (algorithm must match what is specified in JWT header).
        // The JWT is signed using the jsrsasign lib (KJUR)
        let signedJWT = KJUR.jws.JWS.sign('PS256', stringifiedJwtHeader, stringifiedJwtPayload, secret);

        // The signed JWT is the client assertion (encoded JWT) that is used to retrieve an access token
        var clientAssertion = signedJWT

        //=================================================================================================

        let data = qs.stringify({
            'grant_type': 'client_credentials',
            'client_assertion_type': 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            'client_assertion': clientAssertion
        });

        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: server_config.oauth2_url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: data
        };

        var response = await axios.request(config);
        console.log(response.data.access_token)
        return response.data.access_token
    } catch (e) {
        logger.error("fn get_access_token :: " + e)
    }
}
get_access_token();
module.exports = {
    get_access_token
};