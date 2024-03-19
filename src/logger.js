const winston = require("winston");
const winstonDaily = require("winston-daily-rotate-file");
const process = require("process");
require('dotenv').config();

const { combine, timestamp, label, printf } = winston.format;
const logDir = `${process.cwd()}/logs`;

const logFormat = printf(({ level, message, label, timestamp }) => {
   return `${timestamp} [${label}] ${level}: ${message}`; // 날짜 [시스템이름] 로그레벨 메세지
});

const logger = winston.createLogger({
   format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      label({ label: process.env.NODE_ENV }),
      logFormat
   ),
   transports: [
      //logLevel : error > warn > info > http > verbose > debug > silly
      new winstonDaily({
         level: 'http',
         datePattern: 'YYYY-MM-DD',
         dirname: logDir + '/http',
         filename: `%DATE%.http.log`,
         maxFiles: 50,
         zippedArchive: true,
      }),
      new winstonDaily({
         level: 'info',
         datePattern: 'YYYY-MM-DD',
         dirname: logDir  + '/info',
         filename: `%DATE%.log`,
         maxFiles: 50,
         zippedArchive: true,
      }),
      new winstonDaily({
         level: 'warn',
         datePattern: 'YYYY-MM-DD',
         dirname: logDir + '/warn',
         filename: `%DATE%.error.log`,
         maxFiles: 50,
         zippedArchive: true,
      }),
      new winstonDaily({
         level: 'error',
         datePattern: 'YYYY-MM-DD',
         dirname: logDir + '/error',
         filename: `%DATE%.error.log`,
         maxFiles: 50,
         zippedArchive: true,
      }),
   ],
   exceptionHandlers: [
      new winstonDaily({
         level: 'error',
         datePattern: 'YYYY-MM-DD',
         dirname: logDir,
         filename: `%DATE%.exception.log`,
         maxFiles: 30,
         zippedArchive: true,
      }),

   ],
})


   logger.add(
      new winston.transports.Console({
         format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
         ),
      }),
   );


module.exports = logger;