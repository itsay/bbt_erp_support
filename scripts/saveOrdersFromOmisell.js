require("dotenv").config();
const OmisellJobController = require("../route/omisell/omisell.job.controller");
const OmisellApiService = require("../service/omisell/api.service");
const mongoose = require("mongoose");
const { Order } = require('../../model/omisell')
const MisaApiService = require("../service/misa/api.service");

mongoose.set("strictQuery", true);
mongoose.Promise = global.Promise;


/************************CONFIG ************************/
const MONGODB_URL = process.env.MONGODB || 'mongodb://localhost:27017/omisell'
const UPDATED_FROM = '2026-06-16T00:00:00'
/***************************************************** */

mongoose.connect(
    MGON,
    {
        ssl: false,
        tlsAllowInvalidCertificates: true,
        maxPoolSize: 15,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    async (error) => {
        if (error) {
            console.log(`Connect mongodb for app fail: ${error.stack}`)
            return
        }
        console.log(`Connected mongodb for app`);
        await test()

        console.log('done')
    }
)



async function test() {
    await OmisellJobController.jobSaveOrders((new Date() - new Date(UPDATED_FROM)) / 1000)
    console.log('RunData done')
}