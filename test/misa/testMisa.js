require("dotenv").config();
const mongoose = require("mongoose");
const MisaApiService = require("../../service/misa/api.service");
const { OrderDetail, PickupList } = require('../../model/omisell')


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
    const detailDoc = await OrderDetail.findOne({ omisell_order_number: orderNo }).lean()
    const pickupList = await PickupList.find().lean()
    const data = MisaApiService.mapOmisellToCrmSaleOrder(detailDoc, pickupList)
    console.log(data)
}
