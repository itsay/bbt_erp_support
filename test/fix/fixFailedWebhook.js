require("dotenv").config();
const mongoose = require("mongoose");
const MisaApiService = require("../../service/misa/api.service");
const { WebhookEvent } = require('../../model/omisell')
const fs = require('fs');
const path = require('path');
const omisell = require("../../model/omisell");



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
    const failedWebhookData = await WebhookEvent.find({ handle_status: 'FAILED' }).lean();
    const uniqueOmisellOrderNumbers = [
        ...new Set(
            failedWebhookData
                .map(event => event.omisell_order_number || event.data?.omisell_order_number)
                .filter(Boolean)
        )
    ];
    console.log(`Found ${uniqueOmisellOrderNumbers.length} unique failed webhook order numbers.`);

    const retriedSuccessOrders = [];
    const retriedFailedOrders = [];

    for (const omisellOrderNumber of uniqueOmisellOrderNumbers) {
        try {
            const newestWebHookEvent = await WebhookEvent.findOne({
                $or: [
                    { omisell_order_number: omisellOrderNumber },
                    { 'data.omisell_order_number': omisellOrderNumber }
                ]
            }).sort({ receivedAt: -1 }).lean();

            if (!newestWebHookEvent) {
                console.log(`No webhook event found for order: ${omisellOrderNumber}`);
                retriedFailedOrders.push(omisellOrdeNumber);
                continue; r
            }

            console.log(`Processing order: ${omisellOrderNumber}`);
            await MisaApiService.processNewOrderFromWebhook(newestWebHookEvent, true);

            await WebhookEvent.updateMany(
                {
                    $or: [
                        { omisell_order_number: omisellOrderNumber },
                    ]
                },
                { $set: { handle_status: 'SUCCESS' } }
            );

            retriedSuccessOrders.push(omisellOrderNumber);
            await WebhookEvent.updateMany(
                {
                    omisell_order_number: omisellOrderNumber,
                },
                { $set: { handle_status: 'SUCCESS' } }
            )
            console.log(`Retry SUCCESS for order: ${omisellOrderNumber}`);
        } catch (error) {
            retriedFailedOrders.push(omisellOrderNumber);
            await WebhookEvent.updateMany(
                {
                    omisell_order_number: omisellOrderNumber,
                },
                { $set: { handle_status: 'FAILED' } }
            )
            console.log(`Retry FAILED for order ${omisellOrderNumber}:`, error.message);
        }
    }

    console.log(`Retry done. Success: ${retriedSuccessOrders.length}, Failed: ${retriedFailedOrders.length}`);
    if (retriedFailedOrders.length) {
        console.log('Failed orders:', retriedFailedOrders);
    }

    // Write results to files for easy tracking
    try {
        const outDir = path.join(__dirname);
        fs.writeFileSync(
            path.join(outDir, 'retried_success_orders.json'),
            JSON.stringify({ timestamp: new Date(), orders: retriedSuccessOrders }, null, 2)
        );
        fs.writeFileSync(
            path.join(outDir, 'retried_failed_orders.json'),
            JSON.stringify({ timestamp: new Date(), orders: retriedFailedOrders }, null, 2)
        );
        console.log('Wrote retried_success_orders.json and retried_failed_orders.json');
    } catch (err) {
        console.log('Failed to write result files:', err && err.message ? err.message : err);
    }
}