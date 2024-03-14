# npm install
express axios mssql dotenv winston winston-daily-rotate-file crypto-js jsrsasign fs

# .env 파일 작성
<ul>
<li>DB_USER=
<li>DB_PWD=
<li>DB_NAME=
<li>DB_SERVER=localhost
<li>NS_CREDENTIAL_CERT_ID = OAuth 2.0 Client Credentials (M2M) Setup → Certification ID
<li>NS_INTEGRATION_CONSUMER_KEY = Integration's consumer key
<li>CERTIFICATION_FILENAME = @@@_key.pem in certification folder
</ul>

# config.json 작성
```
{
    "oauth2_url":"~~/oauth2/v1/token",
    "restlet_url": "",
    "restlet_HCMS_ACCT_TRSC_PTCL_url":"",
    "run_every_minutes" : 30
}
```
<ul>
<li>oauth2_url : token 발급을 위한 url
<li>restlet_url : 대량이체 레코드를 위한 RESTlet url(script, deploy parameter 포함)
<li>restlet_HCMS_ACCT_TRSC_PTCL_url : 입출금거래내역 레코드를 위한 RESTlet url
<li>run_every_minutes : 인터페이스 간격 (분)
</ul>

# OpenSSL
openssl req -x509 -newkey rsa:3072 -keyout 파일명_key.pem -out 파일명_cert.pem -days 365 -nodes