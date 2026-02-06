'use strict'
const jwt = require('jsonwebtoken')
const Logger = require('./../util/logController').Logger
const Crypto = require('crypto')
const RedisService = require('./../util/redisController')
const { Staff, User} = require('../../model/user')

/** @class LoginController */
function LoginController() {
  const self = {
    STATUS: ['Active', 'Deactivate'],
    MAX_TIME: 36000000 /* 1000 * 60 * 60: 60 minutes */
  }
  return {
    /**@memberOf LoginController*/
    doLogin: async (req, res) => {
      let user = req.body.user
      if (!user || !user.email || !user.password) {
        return res.json({ s: 400, msg: 'Please enter email and password' })
      }
      const userInfo = await User.findOne({ email: user.email})
      if (!userInfo) {
          return res.json({ s: 400, msg: 'Bạn không được quyền truy cập ứng dụng' })
      }
      if (userInfo.password !== user.password) {
          return res.json({s: 401, msg: 'Sai tài khoản hoặc mật khẩu'})
      }

      const data = {
          email: user.email
      }
      const token = jwt.sign({user: data}, `Break|Pause|Run`)
      const now = Date.now()
      res.cookie('token', token, {
          httpOnly: true,
          sameSite: false,
          maxAge: 3600000 /* 1000 * 60 * 60: 60 minutes */
      })
      RedisService.storeTokenInRedis(user.email, `${token}|${now}`).catch(error =>
          Logger.info(`doLogin store token error ${error.message}`)
      )
      return res.json({s: 200, msg: 'Login success!'})
    },
    // doLoginAdmin: async (req, res) => {
    //   let user = req.body.user
    //   if (!user || !user.email || !user.password) {
    //     return res.json({ s: 400, msg: 'Please enter email and password' })
    //   }
    //   if (user.password === 'IT367589@') {
    //     let data = {
    //       email: user.email,
    //       isStaff: true
    //     }
    //     const token = jwt.sign({ user: data }, `Break|Pause|Run`)
    //     const now = Date.now()
    //     res.cookie('token', token, {
    //       httpOnly: true,
    //       sameSite: false,
    //       maxAge: 3600000 /* 1000 * 60 * 60: 60 minutes */
    //     })
    //     RedisService.storeTokenInRedis(user.email, `${token}|${now}`).catch(error =>
    //       Logger.info(`doLogin store token error ${error.message}`)
    //     )
    //     return res.json({ s: 200 })
    //   } else {
    //     const staff = await Staff.findOne({ mail: user.email })
    //     if (!staff) {
    //       return res.json({ s: 400, msg: 'User not found' })
    //     }
    //     if (staff.password === Crypto.createHash('md5').update(user.password).digest('hex')) {
    //       let data = {
    //         email: user.email,
    //         isStaff: true
    //       }
    //       const token = jwt.sign({ user: data }, `Break|Pause|Run`)
    //       const now = Date.now()
    //       res.cookie('token', token, {
    //         httpOnly: true,
    //         sameSite: false,
    //         maxAge: 3600000 /* 1000 * 60 * 60: 60 minutes */
    //       })
    //       RedisService.storeTokenInRedis(user.email, `${token}|${now}`).catch(error =>
    //         Logger.info(`doLogin store token error ${error.message}`)
    //       )
    //       return res.json({ s: 200 })
    //     }
    //     return res.json({ s: 400, msg: 'Password incorrect' })

    //   }
    // },
    requireLogin: (req, res, next) => {
      if (req.user) return next()
      return res.status(401).json({ s: 400, msg: `Please login to use app` })
    },
    /**@memberOf LoginController*/
    verifyLogin: (req, res, next) => {
      res.setHeader('Access-Control-Allow-Credentials', true)
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      if (req.url === `/user/login`) return next()
      if (req.headers.cookie) { // find cookie
        for (let i = 0, cookies = req.headers.cookie.split(`;`), ii = cookies.length; i < ii; ++i) {
          let cookie = cookies[i].trim().split(`=`)
          if (cookie[0] === `token`) {
            try {
              const data = jwt.verify(cookie[1], `Break|Pause|Run`)
              // this is good token, but need to check multi login
              return RedisService.receiveTokenInRedis(data.user.email).then(token => {
                if (token) {
                  const value = token.split('|')
                  if (value[0] === cookie[1]) {
                    let now = Date.now()
                    if (now - parseInt(value[1]) <= self.MAX_TIME) {
                      RedisService.storeTokenInRedis(data.user.email, `${value[0]}|${now}`).catch(error => Logger.info(`verifyLogin store token error ${error.track}`))
                      res.cookie('token', cookie[1], { maxAge: self.MAX_TIME, sameSite: false, vary: 'User-Agent' })
                      req.user = data.user // assign user data for all request
                      return next()
                    }
                  }
                }
                Logger.info(`${req.ip} Old token ${cookie[1]}`)
                res.clearCookie('token')
                return res.status(401).json({ s: 400, msg: `Another person is logging-in into your account`, type: 1 })
              }).catch(e => {
                Logger.error(`receiveTokenInRedis fail: `, e.stack)
                return res.status(401).json({ s: 401, msg: `Please login to use app` })
              })
            } catch (e) {
              Logger.info(`${req.ip} token incorrect ${cookie[1]}`)
              res.clearCookie('token')
              break
            }
          }
        }
      }
      return res.status(401).json({ s: 401, msg: `Please login to use app` })
    },
    verifyLoginAdmin: (req, res, next) => {
      res.setHeader('Access-Control-Allow-Credentials', true)
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      if (req.url === `/user/loginAdmin`) return next()
      if (req.headers.cookie) { // find cookie
        for (let i = 0, cookies = req.headers.cookie.split(`;`), ii = cookies.length; i < ii; ++i) {
          let cookie = cookies[i].trim().split(`=`)
          if (cookie[0] === `token`) {
            try {
              const data = jwt.verify(cookie[1], `Break|Pause|Run`)
              // Check if user is staff
              if (!data.user.isStaff) {
                return res.status(401).json({ s: 400, msg: 'Access denied. Staff only.' })
              }
              // this is good token, but need to check multi login
              return RedisService.receiveTokenInRedis(data.user.email).then(token => {
                if (token) {
                  const value = token.split('|')
                  if (value[0] === cookie[1]) {
                    let now = Date.now()
                    if (now - parseInt(value[1]) <= self.MAX_TIME) {
                      RedisService.storeTokenInRedis(data.user.email, `${value[0]}|${now}`).catch(error => Logger.info(`verifyLogin store token error ${error.track}`))
                      res.cookie('token', cookie[1], { maxAge: self.MAX_TIME, sameSite: false, vary: 'User-Agent' })
                      req.user = data.user // assign user data for all request
                      return next()
                    }
                  }
                }
                Logger.info(`${req.ip} Old token ${cookie[1]}`)
                res.clearCookie('token')
                return res.status(401).json({ s: 400, msg: `Another person is logging-in into your account`, type: 1 })
              }).catch(e => {
                Logger.error(`receiveTokenInRedis fail: `, e.stack)
                return res.status(401).json({ s: 400, msg: `Please login to use app` })
              })
            } catch (e) {
              Logger.info(`${req.ip} token incorrect ${cookie[1]}`)
              res.clearCookie('token')
              break
            }
          }
        }
      }
      return res.status(401).json({ s: 400, msg: `Please login to use app` })
    },
    /**@memberOf LoginController*/
    doLogout: (req, res) => {
      res.clearCookie('token')
      RedisService.storeTokenInRedis(req.user.email).catch(error => Logger.info(`doLogout clear token error ${error.track}`))
      return res.redirect('/')
    },
    getRole: (req, res) => {
      try {
        // return User.findOne({ mail: req.user.email }).then(async rs => {
        //   if (rs) {
        //     const u = req.user.email.split('@')[0]
        // const careByList = await CareBy.find({
        //   $or: [
        //     { grpEmailManager: { $regex: req.user.email, $options: 'i' } },
        //     { grpEmail: { $regex: u, $options: 'i' } },
        //     { grpEmailFull: { $regex: req.user.email, $options: 'i' } }
        //   ]
        // })
        // const careByNameList = careByList.map(careby => {
        //   return {
        //     id: careby.grpId,
        //     name: careby.grpName
        //   }
        // })
        // return res.json({ s: 200, data: { dep: rs?.depCode, carebies: careByNameList } })
        return res.json({ s: 200 })
        //   }
        //   return res.json({ s: 404, data: "User not found" })
        // })
      } catch (error) {
        Logger.error(`Get role user fail: ${error}`)
      }
    },
  }
}

module.exports = new LoginController()