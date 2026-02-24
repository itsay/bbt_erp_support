require("dotenv").config({ path: __dirname + "/.env" });
const SchedulerService = require("./service/scheduler.service");
const mongoose = require("mongoose");
const RedisService = require("./route/util/redisController");
RedisService.initConnection();

mongoose.set("strictQuery", true);
mongoose.Promise = global.Promise;
mongoose.connect(
    process.env.MONGODB,
    {
        maxPoolSize: 5,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    (error) => {
        if (error) {
            console.error(`Connect mongodb for app fail: ${error.stack}`);
            return;
        }
        console.log(`Connected mongodb for app`);
        SchedulerService.startJobs();
        console.log('Scheduler started');

    }
)