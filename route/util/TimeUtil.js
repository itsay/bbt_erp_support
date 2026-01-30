/**@class TimeUtil*/
function TimeUtil() {
  const SELF = {
    getDateISO: (yourDate) => {
      if (!yourDate)
        yourDate = new Date()
      const offset = yourDate.getTimezoneOffset()
      yourDate = new Date(yourDate.getTime() - (offset * 60 * 1000))
      return parseInt(yourDate.toISOString().split('T')[0].split('-').join(''), 10)
    },
    getTimeISO: (yourDate) => {
      if (!yourDate)
        yourDate = new Date()
      const offset = yourDate.getTimezoneOffset()
      yourDate = new Date(yourDate.getTime() - (offset * 60 * 1000))
      return yourDate.toISOString().split('T')[1].split('.')[0].split(':').join('')
    },
    chunkSubstr: (str, size) => {
      const numChunks = Math.ceil(str.length / size)
      const chunks = new Array(numChunks)

      for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
        chunks[i] = str.slice(o, size + o)
      }
      return chunks
    }
  }
  return {
    /**@memberOf TimeUtil
     * @return int hhmmss*/
    getTimeISO: () => {
      return parseInt(SELF.getTimeISO(), 10)
    },
    /**@memberOf TimeUtil
     * @return int yyyymmdd*/
    getDateISO: () => {
      return SELF.getDateISO()
    },
    /**@memberOf TimeUtil
     * @return int yyyymmdd*/
    parseDateISO: (date) => {
      return SELF.getDateISO(date)
    },
    /**@memberOf TimeUtil
     * @description get current date
     * @param format MMDDYYYY | DDMMYYYY | YYYYMMDD (default: MMDDYYYY)
     * @return String MMDDYYYY*/
    getStrDate: (format = 'MMDDYYYY', yourDate) => {
      const now = '' + SELF.getDateISO(yourDate)
      if (format === 'MMDDYYYY')
        return now.substring(4, 6) + now.substring(6) + now.substring(0, 4)
      if (format === 'DDMMYYYY')
        return now.substring(6) + now.substring(4, 6) + now.substring(0, 4)
      if (format === 'DD/MM/YYYY')
        return `${now.substring(6)}/${now.substring(4, 6)}/${now.substring(0, 4)}`
      if (format === 'MM/YYYY')
        return `${now.substring(4, 6)}/${now.substring(0, 4)}`
      if (format === 'MMYYYY')
        return `${now.substring(4, 6)}${now.substring(0, 4)}`
      if (format === 'YYYYMMDD') {
        return `${now.substring(0, 4)}${now.substring(4, 6)}${now.substring(6)}`
      }
      if (format === 'YYYY-MM-DD') {
        return `${now.substring(0, 4)}-${now.substring(4, 6)}-${now.substring(6)}`
      }
      return now;
    },
    /**@memberOf TimeUtil
     * @description get current time
     * @param format  (default: SS:MM:HH)
     * @return String MMDDYYYY*/
    getStrTime: (format = 'SS:MM:HH', yourDate) => {
      if (!yourDate)
        yourDate = new Date()
      let time = SELF.getTimeISO(yourDate)
      return SELF.chunkSubstr('' + time, 2).join(':')
    },
    /**@memberOf TimeUtil
     * @description convert string date to date
     * @param string date (21/04/2022 09:11:27)
     * @return Date*/
    strToDate: (dtStr) => {
      if (!dtStr) return null
      let dateParts = dtStr.split("/");
      let timeParts = dateParts[2].split(" ")[1].split(":");
      dateParts[2] = dateParts[2].split(" ")[0];
      // month is 0-based, that's why we need dataParts[1] - 1
      return new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
    },
    numberWithCommas: (x) => {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    generateOTP: () => {
      // Declare a digits variable
      // which stores all digits
      const digits = '0123456789';
      let OTP = '';
      for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
      }
      return OTP;
    },
    /**
     * Date => YYYYMMDDHHMM
     */
    convertTimeToIntForToMinutes: (yourDate) => {
      const now = '' + SELF.getDateISO(yourDate)
      const time = SELF.getTimeISO(yourDate)
      return Number(`${now}${time.substring(0, 4)}`)
    }
  }
}
module.exports = new TimeUtil()
