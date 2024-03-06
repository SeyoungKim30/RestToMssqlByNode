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

# OpenSSL
openssl req -x509 -newkey rsa:3072 -keyout 파일명_key.pem -out 파일명_cert.pem -days 365 -nodes