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
            console.log(`[WebhookController.jobProcessNewOrders] - start processing new orders, noOrders: ${noOrders}`);
            console.time('[WebhookController.jobProcessNewOrders] - jobProcessNewOrders')
            const lock = await RedisController.storeAtomic('PROCESS_WEBHOOK_ORDERS', '1', 600)
            if (!lock) {
                console.log('[WebhookController.jobProcessNewOrders] - process new orders is locked');
                return;
            }
            try {
                const webhookData = await WebhookEvent.find({ handle_status: StatusWebhookEnum.PENDING }).sort({ receivedAt: 1 }).limit(noOrders).lean()

                // Đã sort tăng dần receivedAt, nên duyệt ngược để lấy luôn webhook mới nhất theo (type, orderNo)
                const grouped = new Map();
                const orderGroupedOrderNos = new Set();
                for (let i = webhookData.length - 1; i >= 0; i--) {
                    const d = webhookData[i];
                    const orderNo = d.order_number || d.data?.omisell_order_number;
                    const type = d.event?.split('.')?.[0];
                    if (orderNo && (type === 'order' || type === 'shipment')) {
                        const key = `${type}_${orderNo}`;
                        if (!grouped.has(key)) {
                            grouped.set(key, { latest: d, orderNo, isOrderGroup: true });
                            orderGroupedOrderNos.add(orderNo);
                        }
                    } else {
                        const key = `others_${d._id}`;
                        grouped.set(key, { latest: d, orderNo, isOrderGroup: false });
                    }
                }

                const toBeProcessedData = Array.from(grouped.values())
                    .filter(g => !(g.orderNo && !g.isOrderGroup && orderGroupedOrderNos.has(g.orderNo)))
                    .map(g => ({ ...g.latest, orderNo: g.orderNo }))
                    .sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));

                for (const data of toBeProcessedData) {
                    const MAX_RETRIES = 3
                    let lastError = null
                    let success = false
                    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                        console.time(`[WebhookController.jobProcessNewOrders] - process new order ${data.order_number}`)
                        try {
                            await MisaApiService.processNewOrderFromWebhook(data)
                            success = true
                        } catch (e) {
                            lastError = e
                            console.log(`[WebhookController.jobProcessNewOrders] - process new order failed (attempt ${attempt}/${MAX_RETRIES})`, e)
                        }
                        console.timeEnd(`[WebhookController.jobProcessNewOrders] - process new order ${data.order_number}`)
                        if (success) break
                    }
                    const query = data.orderNo
                        ? { order_number: data.orderNo, receivedAt: { $lte: data.receivedAt } }
                        : { _id: data._id };
                    if (success) {
                        await WebhookEvent.updateMany(query, { $set: { handle_status: StatusWebhookEnum.SUCCESS } })
                    } else {
                        await WebhookEvent.updateMany(query, { $set: { handle_status: StatusWebhookEnum.FAILED, handle_error: lastError } })
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