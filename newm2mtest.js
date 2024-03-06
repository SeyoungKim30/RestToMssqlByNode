var navigator = {}; // necessary as part of "eval" on jsrsasign lib
var window = {}; // necessary as part of "eval" on jsrsasign lib

const axios = require('axios');
const qs = require('qs');    
const cryptojs = require('crypto-js'); // using crypto js for base64 encoding
require('dotenv').config();
const server_config = require('./config.json')


get_access_token()

async function get_access_token() {
    let jsrsasign_config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://kjur.github.io/jsrsasign/jsrsasign-latest-all-min.js',
        headers: {}
    };

    let jsrsasign_response = await axios.request(jsrsasign_config);
    eval(jsrsasign_response.data);
    console.log("======================jsrsasign-js===============")

    var jwtHeader = {
        alg: 'PS256', // Using PS256, which is one of the algorithms NetSuite supports for client credentials
        typ: 'JWT',
        kid: process.env.NS_CREDENTIAL_CERT_ID // Certificate Id on the client credentials mapping
    };
    let stringifiedJwtHeader = JSON.stringify(jwtHeader);

    // Create JWT payload
    let jwtPayload = {
        iss: process.env.NS_INTEGRATION_CONSUMER_KEY , // consumer key of integration record
        scope: ['restlets', 'rest_webservices'], // scopes specified on integration record
        iat: (new Date() / 1000),               // timestamp in seconds
        exp: (new Date() / 1000) + 3600,        // timestamp in seconds, 1 hour later, which is max for expiration
        aud: server_config.oauth2_url
    };

    var stringifiedJwtPayload = JSON.stringify(jwtPayload);

    // The secret is the private key of the certificate loaded into the client credentials mapping in NetSuite
    let secret = `-----BEGIN PRIVATE KEY-----
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
NPQsMtHfieQX7YXrfw6t5mh5AQ==
-----END PRIVATE KEY-----`;
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
        url: server_config.oauth2_url ,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: data
    };

    var response = await axios.request(config);
    return response.data.access_token
}