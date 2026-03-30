const cmnct = require("./communicator.js")
const db_handle = require("./dbHandle_mybatis.js")

async function main() {
    try {
        await cmnct.run_ptcl();
        await cmnct.run_acct();
    } finally {
        await db_handle.closePool();
    }
}

main();
