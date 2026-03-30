const winston = require("winston");
const winstonDaily = require("winston-daily-rotate-file");
const process = require("process");
require('dotenv').config();

const { combine, timestamp, label, printf } = winston.format;
const logDir = `${process.cwd()}/logs`;
const customLevels = {
   levels: {
      error: 0,
      audit: 1,
      warn: 2,
      info: 3,
      http: 4,
      debug: 5,
   },
   colors: {
      error: 'red',
      audit: 'magenta',
      warn: 'yellow',
      info: 'green',
      http: 'cyan',
      debug: 'white',
   },
};

winston.addColors(customLevels.colors);

const logFormat = printf(({ level, message, label, timestamp }) => {
   return `${timestamp} [${label}] ${level}: ${message}`; // 날짜 [시스템이름] 로그레벨 메세지
});

const logger = winston.createLogger({
   levels: customLevels.levels,
   level: 'debug',
   format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      label({ label: process.env.NODE_ENV }),
      logFormat
   ),
   transports: [
      // logLevel : error > audit > warn > info > http > debug
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
         dirname: logDir + '/info',
         filename: `%DATE%.log`,
         maxFiles: 50,
         zippedArchive: true,
      }),
      new winstonDaily({
         level: 'warn',
         datePattern: 'YYYY-MM-DD',
         dirname: logDir + '/warn',
         filename: `%DATE%.warn.log`,
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
         maxFiles: 50,
         zippedArchive: true,
      }),

   ],
});

if (process.env.NODE_ENV === 'dev') {
   logger.add(
      new winston.transports.Console({
         level: 'debug',
         format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
         ),
      }),
   );
} else {
   logger.add(
      new winston.transports.Console({
         level: 'warn',
         format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
         ),
      }),
   );
}

module.exports = logger;
