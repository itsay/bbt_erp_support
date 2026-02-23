require("dotenv").config();
const OmisellJobController = require("../../route/omisell/omisell.job.controller");
const OmisellApiService = require("../../service/omisell/api.service");
const MisaApiService = require("../../service/misa/api.service");
const mongoose = require("mongoose");
const { Order, OrderDetail, PickupList } = require('../../model/omisell')


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
    await MisaApiService.loadConfig();
    const token = await MisaApiService.getToken();

    const [pendingOrders, pickups] = await Promise.all([
        Order.find({ misa_status: 'PENDING' }).sort({ created_time: 1 }).lean(),
        PickupList.find().lean(),
    ]);

    console.log(`Found ${pendingOrders.length} PENDING orders to process`);
    let success = 0, fail = 0;

    for (let i = 0; i < pendingOrders.length; i++) {
        const doc = pendingOrders[i];
        const orderNo = doc.omisell_order_number || doc.order_number;
        const sentAt = new Date();

        let detailDoc = await OrderDetail.findOne({ omisell_order_number: orderNo }).lean();
        if (!detailDoc || !detailDoc.created_time) {
            console.log(`No detail found for order ${orderNo}, fetching...`);
            let detail = await OmisellApiService.getOrderDetail(orderNo);
            if (detail?.data?.retry_after) {
                console.log('wait after', detail?.data?.retry_after);
                await new Promise(r => setTimeout(r, (Number(detail.data.retry_after) + 1) * 1000));
                detail = await OmisellApiService.getOrderDetail(orderNo);
            }
            console.log('Get details for', orderNo);
            await OrderDetail.updateOne(
                { omisell_order_number: orderNo },
                { $set: { omisell_order_number: orderNo, ...detail?.data, fetchedAt: new Date() } },
                { upsert: true }
            );
            detailDoc = await OrderDetail.findOne({ omisell_order_number: orderNo }).lean();
        }

        const source = detailDoc || doc;
        let crmOrder;
        try {
            crmOrder = MisaApiService.mapOmisellToCrmSaleOrder(source, pickups);
            console.time(`Push ${orderNo}`);
            const misaId = await MisaApiService.addCrmObjects({
                select: 'SaleOrders',
                items: [crmOrder],
                token,
                clientId: process.env.AMIS_CLIENT_ID,
                crmUrl: process.env.AMIS_CRM_URL,
            });
            console.log(`Push SUCCESS | omisell_order_number=${orderNo} | misaId=${misaId}`);
            console.timeEnd(`Push ${orderNo}`);
            await Order.updateOne(
                { _id: doc._id },
                { $set: { misa_status: 'SUCCESS', misa_response: { misa_id: misaId }, misa_sent_time: sentAt, misa_body: crmOrder, misa_id: misaId } }
            );
            success++;
        } catch (err) {
            console.error(`Push FAIL | omisell_order_number=${orderNo} | error=${String(err)}`);
            await Order.updateOne(
                { _id: doc._id },
                { $set: { misa_status: 'FAIL', misa_response: { error: JSON.stringify(err) }, misa_sent_time: sentAt, misa_body: crmOrder } }
            );
            fail++;
        }

        if ((i + 1) % 10 === 0) {
            console.log(`Pushed ${i + 1}/${pendingOrders.length} orders | success=${success} fail=${fail}`);
        }
    }

    console.log(`Done | total=${pendingOrders.length} success=${success} fail=${fail}`);
}