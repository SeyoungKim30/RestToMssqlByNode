// 필요한 패키지 로드
require('dotenv').config();
const sql = require('mssql');

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
        idleTimeoutMillis: 600000
    }
};

const pool = new sql.ConnectionPool(poolConfig);

/*
async function executeQuery() {
    try {
        await pool.connect();
        const result = await pool.query('select * from HCMS_E2C_DMST_REMT_PTCL');
        console.log(result.recordset);
    } catch (err) {
        console.error('Error occurred:', err);
    } finally {
        pool.close();
    }
}
*/

function insert_HCMS_E2C_EVLM_TRNS_PTCL(dataObj) {
var valuesString=``;
      dataObj.forEach(each => {
          let values = `(
              ${each.values.custrecord_swk_cms_cust_no},
              ${each.values.custrecord_swk_cms_amt},
              ${each.values.internalid[0].value},
              ${each.values.custrecord_swk_cms_rcv_holder},
              ${each.values.custrecord_swk_cms_rcv_acct},
              ${each.values.custrecord_swk_cms_bank_cd},
              ${each.values.custrecord_swk_cms_wdrw_acct},
              ${each.values.custrecord_swk_cms_cd},
              ${each.values.custrecord_swk_cms_transfer_file},
              ${each.values.custrecord_swk_cms_transfer_file_seq},
              ${each.values.custrecord_swk_cms_rcv_memo},
              ${each.values.custrecord_swk_cms_wdrw_memo},
              CONVERT(CHAR(8), GETDATE(), 112),
              FORMAT(GETDATE(), 'HHmmss')
              )`
          if(valuesString!=``){valuesString += `, `}
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
      [CMSV_RMTE_NM],
      [CMSV_TRMS_ST_CD],
      [TRNS_DATE],
      [TRMS_ST_CTT],
      [TRNS_TIME],
      [COMM],
      [ERR_CD],
      [ERR_MSG],
      [EVLM_TRNS_SAL_TRNS_DV_CD],
      [CRYP_SMS_TRMS_MBPH_NO],
      [SMS_TRMS_YN],
      [APNX_FILE_NM],
      [REMT_SEQ_NO],
      [RCV_PSBK_MARK_CTT],
      [WDRW_PSBK_MARK_CTT],
      [REG_DT],
      [REG_TM]) values `+ valuesString
      console.log(insertQ)

}

module.exports = { insert_HCMS_E2C_EVLM_TRNS_PTCL };