require("dotenv").config();
const mongoose = require("mongoose");
const OmisellJobController = require('../route/omisell/omisell.job.controller')


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
    const unixUpdatedTime = '1771693200'
    await OmisellJobController.jobSaveOrders(unixUpdatedTime)

}