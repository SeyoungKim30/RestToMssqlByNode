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
        let valuesString = ``;
        dataObj.forEach(each => {
            let values = `(
            '${each.values.custrecord_swk_cms_cust_no}',
            ${each.values.custrecord_swk_cms_amt},
            '${each.values.internalid[0].value}',
            '${each.values.custrecord_swk_cms_rcv_holder}',
            '${each.values.custrecord_swk_cms_rcv_acct}',
            '${each.values.custrecord_swk_cms_bank_cd}',
            '${each.values.custrecord_swk_cms_wdrw_acct}',

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
        logger.error("DB : HCMS_E2C_EVLM_TRNS_PTCL : insert_ :: " + e)
    }
}

async function select_HCMS_E2C_EVLM_TRNS_PTCL_to_update(dataObj) {
    try {
        var filenamecondition = ``;
        if (dataObj.length == 1) {
            let each = dataObj[0];
            filenamecondition = `APNX_FILE_NM = '${each["values"]["GROUP(custrecord_swk_cms_transfer_file)"]} '`
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
        logger.error("DB : HCMS_E2C_EVLM_TRNS_PTCL : select_ :: " + e)
    }
}

/********************** 거래 내역**********************/
async function select_HCMS_ACCT_TRSC_PTCL() {
      const query = `WITH Top10Records AS ( SELECT TOP 10 * FROM [HCMS_ACCT_TRSC_PTCL] WHERE NS_INTFC IS NULL ORDER BY INDATE ASC )
		UPDATE Top10Records SET NS_INTFC = GETDATE()
		OUTPUT inserted.* ;`

    //const query = `update [HCMS_ACCT_TRSC_PTCL] set NS_INTFC= GETDATE() output inserted.* where NS_INTFC IS NULL;`
    //테스트용 const query = `update [HCMS_ACCT_TRSC_PTCL] set NS_INTFC= GETDATE() output inserted.* where TRSC_DT = '20231130';`
    return await executeQuery(query);
}

/*****************************국내 외화*******************************/
async function insert_HCMS_E2C_DMST_REMT_PTCL(dataObj) {
    try {
        let valuesString = ``;
        dataObj.forEach(each => {
            let values = `(
                '${each.values.custrecord_swk_cms_cust_no}',
                '${each.values.custrecord_swk_cms_amt}',
                '${each.values.custrecord_swk_cms_curr}',
                '${each.values.internalid[0].value}',
                '${each.values.custrecord_swk_cms_rcv_holder}',
                '${each.values.custrecord_swk_cms_rcv_acct}',
                '${each.values.custrecord_swk_cms_bank_cd}',
                '${each.values.custrecord_swk_cms_wdrw_acct}',
                '0',
                '${each.values.custrecord_swk_cms_transfer_file}',
                '${each.values.custrecord_swk_cms_transfer_file_seq}',
                CONVERT(CHAR(8), GETDATE(), 112),
                FORMAT(GETDATE(), 'HHmmss')
              )`
            if (valuesString != ``) { valuesString += `, ` }
            valuesString += values;
        });
        //TRMS_ST_CTT : (0: 등록 ,1: 등록(CBS 전송 완료) , 2: 실행  ,3: 삭제)
        let insertQ = `INSERT INTO [dbo].[HCMS_E2C_DMST_REMT_PTCL]		
      (		
        [CUST_NO],
        [REMT_AMT],
        [CMSV_CUR_CD],
        [ERP_LNK_CTT],
        [RMTE_NM1],
        [CRYP_RMTE_ACCT_NO],
        [BIC_CD],
        [CRYP_WDRW_ACCT_NO],
        [TRMS_ST_CTT],
        [FILE_NM],
        [SEQ_NO],
        [REG_DT],
        [REG_TM]
      ) 
      OUTPUT inserted.ERP_LNK_CTT, inserted.REG_DT, inserted.REG_TM, inserted.TRMS_ST_CTT
      VALUES `+ valuesString;
        let result = executeQuery(insertQ);
        return result;
    } catch (e) {
        logger.error("DB : HCMS_E2C_DMST_REMT_PTCL : insert_ :: " + e)
    }
}
async function select_HCMS_E2C_DMST_REMT_PTCL_to_update(dataObj) {
    //TRMS_ST_CTT가 0 이면 전송전, 1이면 CMS에서 넣어준거
    try {
        var filenamecondition = ``;
        if (dataObj.length == 1) {
            let each = dataObj[0];
            filenamecondition = `FILE_NM = '${each["values"]["GROUP(custrecord_swk_cms_transfer_file)"]}'`
        } else {
            for (let i = 0; i < dataObj.length; i++) {
                if (i == 0) { filenamecondition += `(`; }
                let each = dataObj[i];
                let filename = each["values"]["GROUP(custrecord_swk_cms_transfer_file)"];
                filenamecondition += `FILE_NM = '${filename}' `;
                if (i + 1 < dataObj.length) { filenamecondition += `OR `; }
                if (i + 1 == dataObj.length) { filenamecondition += `)`; }
            }
        }

        await pool.connect();
        let query = `select * from [HCMS_E2C_DMST_REMT_PTCL]
        where ${filenamecondition} AND TRMS_ST_CTT != '0' ; `
        var result = await executeQuery(query)
        return result;
    } catch (e) {
        logger.error("DB : HCMS_E2C_DMST_REMT_PTCL : select_ :: " + e)
    }
}

/*****************************해외 외화*******************************/
async function insert_HCMS_E2C_OVRS_REMT_PTCL(dataObj) {
    try {
        let valuesString = ``;
        dataObj.forEach(each => {
            let values = `(
                NULLIF('${each.values.custrecord_swk_cms_cust_no}',''),
                '${each.values.custrecord_swk_cms_amt}',
                '${each.values.custrecord_swk_cms_curr}',
                '${each.values.internalid[0].value}',
                '${each.values.custrecord_swk_cms_bank_cd}',
                NULLIF('${each.values.custrecord_swk_cms_wdrw_acct}',''),
                ${each.values.custrecord_swk_cms_comm_alot_dv_cd},
                NULLIF('${each.values.custrecord_swk_cms_cnfr_imp_sche_dd_yn}',''),
                NULLIF('${each.values.custrecord_swk_cms_cnty_cd}',''),
                NULLIF('${each.values.custrecord_swk_cms_expt_cont_cncl_yn}',''),
                NULLIF('${each.values.custrecord_swk_cms_wdrw_acct}',''),
                ${each.values.custrecord_swk_cms_frc_wdrw_amt},
                NULLIF('${each.values.custrecord_swk_cms_hs_cd}',''),
                NULLIF('${each.values.custrecord_swk_cms_imp_dcl_no}',''),
                NULLIF('${each.values.custrecord_swk_cms_imp_usag_dv_cd}',''),
                ${each.values.custrecord_swk_cms_krw_eqv_amt},
                NULLIF('${each.values.custrecord_swk_cms_prc_trcn_cd}',''),
                '${each.values.custrecord_swk_cms_cryp_rmte_acct_no}',
                NULLIF('${each.values.custrecord_swk_cms_rmte_adr1}',''),
                NULLIF('${each.values.custrecord_swk_cms_rmte_adr2}',''),
                NULLIF('${each.values.custrecord_swk_cms_rmte_adr3}',''),
                '${each.values.custrecord_swk_cms_rcvg_bnk_adr1}',
                NULLIF('${each.values.custrecord_swk_cms_rcvg_bnk_adr2}',''),
                NULLIF('${each.values.custrecord_swk_cms_rcvg_bnk_adr3}',''),
                '${each.values.custrecord_swk_cms_rcvg_bnk_nm}',
                NULLIF('${each.values.custrecord_swk_cms_cryp_rmte_emal_adr1}',''),
                NULLIF('${each.values.custrecord_swk_cms_cryp_rmte_emal_adr2}',''),
                '${each.values.custrecord_swk_cms_rmte_nm1}',
                NULLIF('${each.values.custrecord_swk_cms_rmte_oder_mtr1}',''),
                NULLIF('${each.values.custrecord_swk_cms_rmte_oder_mtr2}',''),
                NULLIF('${each.values.custrecord_swk_cms_cryp_rmte_res_reg_no}',''),
                NULLIF('${each.values.custrecord_swk_cms_remt_apc_buss_br_no}',''),
                NULLIF('${each.values.custrecord_swk_cms_remt_rsn}',''),
                NULLIF('${each.values.custrecord_swk_cms_remt_rmrk}',''),
                '${each.values.custrecord_swk_cms_transfer_file}',
                '${each.values.custrecord_swk_cms_transfer_file_seq}',
                0,
                CONVERT(CHAR(8), GETDATE(), 112),
                FORMAT(GETDATE(), 'HHmmss')
                )`

            if (valuesString != ``) { valuesString += `, ` }
            valuesString += values;
        });
        //TRMS_ST_CTT : (0: 전송 , 1: CMS에 등록 , 2: 실행  ,3: 삭제)
        let insertQ = `INSERT INTO [dbo].[HCMS_E2C_OVRS_REMT_PTCL]		
      ([CUST_NO],
        [REMT_AMT],
        [CMSV_CUR_CD],
        [ERP_LNK_CTT],
        [BIC_CD],
        [CRYP_WDRW_ACCT_NO],
        [COMM_ALOT_DV_CD],
        [CNFR_IMP_SCHE_DD_YN],
        [CNTY_CD],
        [EXPT_CONT_CNCL_YN],
        [CRYP_FRC_WDRW_ACCT_NO],
        [FRC_WDRW_AMT],
        [HS_CD],
        [IMP_DCL_NO],
        [IMP_USAG_DV_CD],
        [KRW_EQV_AMT],
        [PRC_TRCN_CD],
        [CRYP_RMTE_ACCT_NO],
        [RMTE_ADR1],
        [RMTE_ADR2],
        [RMTE_ADR3],
        [RCVG_BNK_ADR1],
        [RCVG_BNK_ADR2],
        [RCVG_BNK_ADR3],
        [RCVG_BNK_NM1],
        [CRYP_RMTE_EMAL_ADR1],
        [CRYP_RMTE_EMAL_ADR2],
        [RMTE_NM1],
        [RMTE_ODER_MTR1],
        [RMTE_ODER_MTR2],
        [CRYP_RMTE_RES_REG_NO],
        [REMT_APC_BUSS_BR_NO],
        [REMT_RSN],
        [REMT_RMRK],
        [FILE_NM],
        [SEQ_NO],
        [TRMS_ST_CTT],
        [REG_DT],
        [REG_TM]
      ) 
      OUTPUT inserted.ERP_LNK_CTT, inserted.REG_DT, inserted.REG_TM, inserted.TRMS_ST_CTT
      VALUES `+ valuesString;
        let result = executeQuery(insertQ);
        return result;
    } catch (e) {
        logger.error("DB : HCMS_E2C_DMST_REMT_PTCL : insert_ :: " + e)
    }
}

async function select_HCMS_E2C_OVRS_REMT_PTCL_to_update(dataObj) {
    //TRMS_ST_CTT가 0 이면 전송전, 1이면 CMS에서 넣어준거
    try {
        var filenamecondition = ``;
        if (dataObj.length == 1) {
            let each = dataObj[0];
            filenamecondition = `FILE_NM = '${each["values"]["GROUP(custrecord_swk_cms_transfer_file)"]}'`
        } else {
            for (let i = 0; i < dataObj.length; i++) {
                if (i == 0) { filenamecondition += `(`; }
                let each = dataObj[i];
                let filename = each["values"]["GROUP(custrecord_swk_cms_transfer_file)"];
                filenamecondition += `FILE_NM = '${filename}' `;
                if (i + 1 < dataObj.length) { filenamecondition += `OR `; }
                if (i + 1 == dataObj.length) { filenamecondition += `)`; }
            }
        }

        await pool.connect();
        let query = `select * from [HCMS_E2C_OVRS_REMT_PTCL]
            where ${filenamecondition} AND TRMS_ST_CTT != '0' ; `
        var result = await executeQuery(query)
        return result;
    } catch (e) {
        logger.error("DB : HCMS_E2C_OVRS_REMT_PTCL : select_ :: " + e)
    }
}

module.exports = {
    insert_HCMS_E2C_EVLM_TRNS_PTCL,
    select_HCMS_E2C_EVLM_TRNS_PTCL_to_update,
    select_HCMS_ACCT_TRSC_PTCL,
    insert_HCMS_E2C_DMST_REMT_PTCL,
    select_HCMS_E2C_DMST_REMT_PTCL_to_update,
    insert_HCMS_E2C_OVRS_REMT_PTCL,
    select_HCMS_E2C_OVRS_REMT_PTCL_to_update
};