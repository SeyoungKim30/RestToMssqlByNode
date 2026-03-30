const cmnct = require("./communicator.js")
const db_handle = require("./dbHandle_mybatis.js")
const server_config = require('../config.json');

cmnct.run_ptcl();
cmnct.run_acct();

setInterval(cmnct.run_ptcl, 60 * 1000 * server_config.run_every_minutes);
setInterval(cmnct.run_acct, 60 * 1000 * server_config.run_acct_trsc_ptcl);

async function shutdown() {
    await db_handle.closePool();
    process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
