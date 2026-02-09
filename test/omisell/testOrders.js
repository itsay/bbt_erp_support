require("dotenv").config();
const OmisellJobController = require("../../route/omisell/omisell.job.controller");
const OmisellApiService = require("../../service/omisell/api.service");
const mongoose = require("mongoose");
const { Order } = require('../../model/omisell')
const MisaApiService = require("../../service/misa/api.service");



mongoose.set("strictQuery", true);
mongoose.Promise = global.Promise;

mongoose.connect(
    process.env.MONGODB,
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
    await MisaApiService.testUpdateOrder()

    // await OmisellJobController.jobSaveOrders(1769878800)
    // const res = await OmisellApiService.getOrderDetail('OV2602051DB22804')
    // console.log(res)
}