const Logger = require('./logController').Logger
const redis = require('redis')
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
})


function RedisService() {
  return {
    storeTokenInRedis: function (key, value) {
      return new Promise((resolve, reject) => {
        key = 'fin_' + key
        if (!value) {
          client.del(key)
          return resolve()
        } else {
          client.set(key, value, function (error) {
            if (error) return reject(error)
            return resolve()
          })
        }
      })
    },
    receiveTokenInRedis: async function (key) {
      try {
        //console.log(`receiveTokenInRedis with token: `, key);
        const reply = await client.get('fin_' + key)
        return Promise.resolve(reply)
      } catch (error) {
        Logger.info(`receiveTokenInRedis - fail: `, error)
        return Promise.reject(error)
      }
    },
    verifyTokenInRedis: function (playerId, token, callback) {
      /* client.get("p_" + playerId, function(err, reply){
       callback(token === reply)
       }); */
      client.eval("return redis.call('get', ARGV[1]) == ARGV[2]", 0, 'fin_' + playerId, token, (error, response) => {
        if (error) Logger.info(error)
        else callback(response === 1)
      })
    },
    getDataByKey: (key) => {
      return client.get(key).then(result => {
        return Promise.resolve(result)
      }).catch(e => {
        return Promise.reject(e)
      })
    },
    /**@params: expTime (seconds) */
    setDataByKey: (key, value, expTime = null) => {
      return new Promise((resolve, reject) => {
        client.set(key, value, (err, result) => {
          if (err) {
            Logger.error(`setDataByKey - key: ${key} - fail: ${err.stack}`)
            return reject(err)
          }
        })
        if (expTime) {
          client.expire(key, expTime)
        }
        return resolve()
      })
    },
    clearDataByKey: async (key) => {
      client.del(key)
      return Promise.resolve()
    },
    connect: () => {
      return new Promise(async (resolve, reject) => {
        return redis.createClient({ url: `redis://127.0.0.1:6379` })
          .connect().then(rs => {
            Logger.info('Connected to local redis')
            client = rs
            return resolve()
          }).catch(e => {
            Logger.info(`Connected to local redis error: ${e}`)
            return reject(e)
          })
      })
    },
    initConnection: async () => {
      client.on('error', function (err) {
          Logger.info(`Error on connect Redis ${err}`)
      }).connect().then(() => {
          Logger.info(`Connected to Redis`)
      }).catch(e => {
          Logger.error(`Connected to Redis fail: `, e)
      })
  }
  }
}
module.exports = RedisService()
