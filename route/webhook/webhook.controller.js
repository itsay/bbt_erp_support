const { WebhookEvent } = require('../../model/omisell')
const StatusWebhookEnum = require('../../common/enums/status-webhook.eum')
const MisaApiService = require('../../service/misa/api.service')
const RedisController = require('../util/redisController')

function WebhookController() {
    return {
        receiveWebhook: async (req, res) => {
            console.log(`[receiveWebhook] - payload: ${JSON.stringify(req.body)}`);
            WebhookEvent.create({
                ...req.body,
                ...req.body.data,
                receivedAt: new Date(),
                handle_status: StatusWebhookEnum.PENDING,
            }).catch((err) => {
                console.log(`[receiveWebhook] - saveTracking - fail: `, err.stack);
            })
            return res.json({ msg: "Webhook received" });
        },
        /**
         * Xử lý batch đơn hàng mới theo schedule
         * @param {Number} noOrders Số lượng đơn hàng cần xử lý
         */
        jobProcessNewOrders: async (noOrders = 100) => {
            console.time('[WebhookController.jobProcessNewOrders] - jobProcessNewOrders')
            const lock = await RedisController.storeAtomic('PROCESS_WEBHOOK_ORDERS', '1', 600)
            if (!lock) {
                console.log('[WebhookController.jobProcessNewOrders] - process new orders is locked');
                return;
            }
            try {
                const webhookData = await WebhookEvent.find({ handle_status: StatusWebhookEnum.PENDING }).sort({ receivedAt: -1 }).limit(noOrders).lean()
                for (const data of webhookData) {
                    const MAX_RETRIES = 3
                    let lastError = null
                    let success = false
                    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                        try {
                            await MisaApiService.processNewOrderFromWebhook(data)
                            success = true
                            break
                        } catch (e) {
                            lastError = e
                            console.log(`[WebhookController.jobProcessNewOrders] - process new order failed (attempt ${attempt}/${MAX_RETRIES})`, e.stack)
                        }
                    }
                    if (success) {
                        await WebhookEvent.updateMany(
                            { _id: { $in: data._id } },
                            { $set: { handle_status: StatusWebhookEnum.SUCCESS } }
                        )
                    } else {
                        await WebhookEvent.updateMany(
                            { _id: { $in: data._id } },
                            { $set: { handle_status: StatusWebhookEnum.FAILED, handle_error: lastError.stack } }
                        )
                    }
                }
            } catch (e) {
                console.log(`[WebhookController.jobProcessNewOrders] - process new orders failed`, e.stack)
            } finally {
                RedisController.delKey('PROCESS_WEBHOOK_ORDERS')
            }
            console.timeEnd('[WebhookController.jobProcessNewOrders] - jobProcessNewOrders')
        }
    }
}

module.exports = WebhookController();