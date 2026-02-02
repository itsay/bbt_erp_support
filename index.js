require("dotenv").config({ path: __dirname + "/.env" });
const Logger = require("./route/util/logController").Logger;
const express = require("express");
const mongoose = require("mongoose");
const cluster = require("cluster");
const RedisService = require("./route/util/redisController");
const TrackingController = require("./route/tracking/trackingController");
const webhook = require("./route/webhook");

RedisService.initConnection();
if (cluster.isMaster) {
    let cpuCount = require('os').cpus().length; //require('os').cpus().length
    for (let i = 0; i < cpuCount; ++i) {
        let worker = cluster.fork();
        worker.on("message", function (request) {
            // listen message from worker
            handleRequestFromWorker(request);
        });
    }
} else {
    const home = require("./route/home");
    const path = require("path");
    const fs = require("fs");
    const { exec } = require("child_process");
    const app = express();

    app.use(express.json({ limit: "25mb" }));
    app.use(express.urlencoded({ limit: "25mb", extended: true }));
    app.enable("trust proxy");

    app.use(express.static(path.join(__dirname, 'public')));
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 1;
    app.get("/webhook/deloy", async (req, res) => {
        console.log(`Received webhook deloy`);
        await exec("sh deloy.sh", (error, stdout, stderr) => {
            if (error) {
                console.log(`exec error: ${error}`);
                return res.json({ s: 500, msg: "Deployment failed" });
            }
        });
        return res.json({ s: 200, msg: "Deployed successfully" });
    });
    app.use('/webhook', webhook)
    app.use("/v1", home);
    app.get('*', function (req, res) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    mongoose.set("strictQuery", true);
    mongoose.Promise = global.Promise;
    mongoose.connect(
        process.env.MONGODB,
        {
            maxPoolSize: 15,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        },
        function (error) {
            if (error) {
                Logger.error(`Connect mongodb for app fail: ${error.stack}`);
                return;
            }
            Logger.info(`Worker ${process.pid} Connected mongodb for app`);
            app.listen(process.env.WEB_PORT, function () {
                Logger.info(
                    `Worker ${process.pid} listen on port ${process.env.WEB_PORT}`
                );
            });
        }
    );
}

cluster.on("exit", function (worker) {
    console.log(`Worker ${worker.process.pid} die. Call new worker`);
    const w = cluster.fork();
    w.on("message", function (request) {
        handleRequestFromWorker(request);
    });
});

function handleRequestFromMaster(request) {
    console.log(
        `Worker ${process.pid} receive request ${JSON.stringify(
            request
        )} from master`
    );
}

function handleRequestFromWorker(request) {
    // console.log(
    //   `I\`m master ${process.pid}. I received request from worker: ${JSON.stringify(request)}`
    // );
}
