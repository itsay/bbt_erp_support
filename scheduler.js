require("dotenv").config({ path: __dirname + "/.env" });
const SchedulerService = require("./service/scheduler.service");
const mongoose = require("mongoose");

mongoose.set("strictQuery", true);
mongoose.Promise = global.Promise;
mongoose.connect(
    process.env.MONGODB,
    {
        maxPoolSize: 5,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    function (error) {
        if (error) {
            console.error(`Connect mongodb for app fail: ${error.stack}`);
            return;
        }
        console.log(`Connected mongodb for app`);
        SchedulerService.startJobs();

        process.on("exit", () => {
            SchedulerService.stopJobs();
        });
    }
)
