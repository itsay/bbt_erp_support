'use strict'
const winston = require('winston')
const fs = require("fs");
const crypto = require("crypto");
const TimeUtil = require("./TimeUtil");

const format = winston.format
const myFormat = format.printf(info => {
  const data = {timestamp: new Date(info.timestamp).toLocaleString(), message: info.message}
  return `${JSON.stringify(data)}`
})
winston.loggers.add('default', {
  transports: [
    new winston.transports.File({
      maxsize: 10000000, /*10MB*/
      filename: __dirname + '/../../logs/log.log',
      format: format.combine(format.timestamp(), myFormat)
    }),
    new winston.transports.Console({
      format: format.combine(format.timestamp(), myFormat)
    })
  ]
})
winston.loggers.add('scheduler', {
  transports: [
    new winston.transports.File({
      maxsize: 10000000, /*10MB*/
      filename: __dirname + '/../../logs/scheduler.log',
      format: format.combine(format.timestamp(), myFormat)
    }),
    new winston.transports.Console({
      format: format.combine(format.timestamp(), myFormat)
    })
  ]
})

function CmdLogLinux () {
  const SELF = {
    ENCRYPTION_KEY: 'ef71ed98a5b755ea8baef13787c7cce6a57e5e7445d1cb9421bb602c14992473',
    ENCRYPTION_IV: '0a38a3ca150b57a54bdc4f344b8dca74',
    // Hàm mã hóa AES-256-CBC
    encrypt: (text) => {
      const key = Buffer.from(SELF.ENCRYPTION_KEY, "hex"); // 32 bytes
      const iv = Buffer.from(SELF.ENCRYPTION_IV, "hex"); // 16 bytes

      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");
      return encrypted;
    }
  }
  return {
    readAnsEncrypt: () => {
      const logPath = "/var/log"
      const inputFile = `/cmdlog.log`;
      const outputFile = `/cmdlog_${TimeUtil.getStrDate('YYYYMMDD')}.log`;

      fs.readFile(logPath + inputFile, "utf8", (err, data) => {
        if (err) {
          console.error("readAnsEncrypt - Read cmd log fail: ", err);
          return;
        }

        const encryptedData = SELF.encrypt(data);

        fs.writeFile(logPath + outputFile, encryptedData, (err) => {
          if (err) {
            console.error("readAnsEncrypt - Write cmd log fail: ", err);
            return;
          }
          console.log(`readAnsEncrypt - Encrypted and write file done: ${outputFile}`);

          fs.writeFile(logPath + inputFile, "", (err) => {
            if (err) {
              console.error("readAnsEncrypt - Empty cmd log fail:", err);
              return
            }
            console.log(`readAnsEncrypt - Empty cmd log done`);
          });
        });
      });
    }
  }
}

module.exports = {
  Logger: winston.loggers.get('default'),
  Scheduler: winston.loggers.get('scheduler'),
  CmdLogLinux: new CmdLogLinux()
}