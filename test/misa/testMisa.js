require("dotenv").config();
const mongoose = require("mongoose");
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
    const webhookData = {
        "_id": {
            "$oid": "69899d2917c8cd96f2e47437"
        },
        "data": {
            "order_number": "26020981DCSJY7",
            "omisell_order_number": "OV26020987D097FD",
            "created_time": 1770577201,
            "updated_time": 1770619817,
            "escrow_release_time": 0,
            "status_id": 500,
            "status_name": "Đã bàn giao",
            "is_fulfilled": true
        },
        "shop_id": 22931,
        "seller_id": 324844,
        "platform": "shopee_v2",
        "event": "order.shipped",
        "timestamp": 1770626335,
        "request_id": "69899d1f0a3714dfa05f1f81",
        "order_number": "26020981DCSJY7",
        "omisell_order_number": "OV26020987D097FD",
        "created_time": 1770577201,
        "updated_time": 1770619817,
        "escrow_release_time": 0,
        "status_id": 500,
        "status_name": "Đã bàn giao",
        "is_fulfilled": true,
        "receivedAt": {
            "$date": "2026-02-09T08:39:05.185Z"
        },
        "handle_status": "pending"
    }
    const data = await MisaApiService.processNewOrderFromWebhook(webhookData)
    console.log(data)
}