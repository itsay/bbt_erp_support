require("dotenv").config();
const OmmiSellService = require("../../service/omisell.service");
const mongoose = require("mongoose");



mongoose.set("strictQuery", true);
mongoose.Promise = global.Promise;

mongoose.connect(
    config.MONGODB,
    {
        ssl: true,
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
        test()

        console.log('done')
    }
)



async function test() {
    const orders = await OmmiSellService.getOrders();
    const order = orders[0]
    console.log(JSON.stringify(order, null, 2))
    const orderDetail = await OmmiSellService.getOrderDetail(order.omisell_order_number);
    console.log(JSON.stringify(orderDetail, null, 2));
}