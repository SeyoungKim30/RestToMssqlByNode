// 필요한 패키지 로드
require('dotenv').config();
const sql = require('mssql');
const logger = require("./logger.js");

const poolConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    options: {
        encrypt: true, // for Azure
        trustServerCertificate: true // change to true for local dev / self-signed certs
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 200000
    }
};

const pool = new sql.ConnectionPool(poolConfig);


async function executeQuery(querystring) {
    try {
        await pool.connect();
        var result = { "type": "success", "result": await pool.query(querystring) };
    } catch (err) {
        logger.error(`DB : executeQuery :: ${err} :: ${querystring}`);
        var result = { "type": "error", "error": err.message };
    } finally {
        pool.close();
    }
    return result;
}


async function insert_HCMS_E2C_EVLM_TRNS_PTCL(dataObj) {
    try {
        var valuesString = ``;
        dataObj.forEach(each => {
            let values = `(
            '${each.values.custrecord_swk_cms_cust_no}',
            ${each.values.custrecord_swk_cms_amt},
            '${each.values.internalid[0].value}',
            '${each.values.custrecord_swk_cms_rcv_holder}',
            '${each.values.custrecord_swk_cms_rcv_acct}',
            '${each.values.custrecord_swk_cms_bank_cd}',
            '${each.values.custrecord_swk_cms_wdrw_acct}',
            '${each.values.custrecord_swk_cms_cd}',
            '${each.values.custrecord_swk_cms_transfer_file}',
            ${each.values.custrecord_swk_cms_transfer_file_seq},
            '${each.values.custrecord_swk_cms_rcv_memo}',
            '${each.values.custrecord_swk_cms_wdrw_memo}',
              CONVERT(CHAR(8), GETDATE(), 112),
              FORMAT(GETDATE(), 'HHmmss'),
              '${each.values.custrecord_swk_cms_sms_if_flag}',
              '${each.values.custrecord_swk_cms_type}',
              'R'
              )`
            if (valuesString != ``) { valuesString += `, ` }
            valuesString += values;
        });

        let insertQ = `INSERT INTO [dbo].[HCMS_E2C_EVLM_TRNS_PTCL]		
      (		
      [CUST_NO],
      [TRSC_AMT],
      [ERP_LNK_CTT],
      [ACCT_EPCT_OWAC_NM],
      [CRYP_RCV_ACCT_NO],
      [RCV_INST_DV_NO],
      [CRYP_WDRW_ACCT_NO],
      [CMSV_CD],
      [APNX_FILE_NM],
      [REMT_SEQ_NO],
      [RCV_PSBK_MARK_CTT],
      [WDRW_PSBK_MARK_CTT],
      [REG_DT],
      [REG_TM],
      [SMS_TRMS_YN],
      [EVLM_TRNS_SAL_TRNS_DV_CD],
      [CMSV_TRMS_ST_CD]
      ) 
      OUTPUT inserted.ERP_LNK_CTT, inserted.REG_DT, inserted.REG_TM, inserted.CMSV_TRMS_ST_CD
      VALUES `+ valuesString;

        let result = executeQuery(insertQ);
        return result;
    } catch (e) {
        logger.error("HCMS_E2C_EVLM_TRNS_PTCL DB : insert_ :: " + e)
    }
}

async function select_HCMS_E2C_EVLM_TRNS_PTCL_to_update(dataObj) {
    try {
        var filenamecondition = ``;
        if (dataObj.length == 1) {
            let each = dataObj[0];
            filenamecondition = `APNX_FILE_NM = '${each["values"]["GROUP(custrecord_swk_cms_transfer_file) "]} '`
        } else {
            for (let i = 0; i < dataObj.length; i++) {
                if (i == 0) { filenamecondition += `(`; }
                let each = dataObj[i];
                let filename = each["values"]["GROUP(custrecord_swk_cms_transfer_file)"];
                filenamecondition += `APNX_FILE_NM = '${filename}' `;
                if (i + 1 < dataObj.length) { filenamecondition += `OR `; }
                if (i + 1 == dataObj.length) { filenamecondition += `)`; }
            }
        }

        await pool.connect();
        let query = `select [ERP_LNK_CTT],[REG_DT],[REG_TM],[CMSV_RMTE_NM], [CMSV_TRMS_ST_CD],[TRNS_DATE],[TRMS_ST_CTT],[TRNS_TIME],[COMM],[ERR_CD],[ERR_MSG] from [HCMS_E2C_EVLM_TRNS_PTCL] where ${filenamecondition} AND TRMS_ST_CTT is not null; `
        var result = await executeQuery(query)
        return result;
    } catch (e) {
        logger.error("HCMS_E2C_EVLM_TRNS_PTCL DB : select_ :: " + e)
    }
}

async function select_HCMS_ACCT_TRSC_PTCL() {
    const query = `select * from HCMS_ACCT_TRSC_PTCL where NS_INTFC IS NULL;`
    executeQuery(query)
}

module.exports = {
    insert_HCMS_E2C_EVLM_TRNS_PTCL,
    select_HCMS_E2C_EVLM_TRNS_PTCL_to_update
};