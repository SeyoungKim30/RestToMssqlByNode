const cmnct = require("./communicator.js")
const server_config = require('../config.json');

cmnct.run_ptcl();
cmnct.run_acct();

let time1 = 60 * 1000 * server_config.run_every_minutes ;
let time2 =  60 * 1000 *server_config.run_acct_trsc_ptcl;

setInterval(cmnct.run_ptcl,time1);
setInterval(cmnct.run_acct, time2);