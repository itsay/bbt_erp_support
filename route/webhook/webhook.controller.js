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

                // Lọc các trạng thái đơn hàng và giao hàng mới nhất của mỗi đơn hàng (xác định bằng order_number), sort theo receivedAt
                const grouped = {};
                const orderToBatchIds = {};
                webhookData.forEach(d => {
                    const orderNo = d.order_number || d.data?.omisell_order_number;
                    const type = d.event?.split('.')?.[0];
                    if (orderNo) {
                        if (!orderToBatchIds[orderNo]) orderToBatchIds[orderNo] = [];
                        orderToBatchIds[orderNo].push(d._id);
                    }
                    if (orderNo && (type === 'order' || type === 'shipment')) {
                        const key = orderNo;
                        if (!grouped[key]) {
                            grouped[key] = { latest: d, allIds: [], orderNo, isOrderGroup: true };
                        }
                        // Vì webhookData đã sort ascending theo receivedAt, nên item sau cùng sẽ là mới nhất
                        if (new Date(d.receivedAt) >= new Date(grouped[key].latest.receivedAt)) {
                            grouped[key].latest = d;
                        }
                        grouped[key].allIds.push(d._id);
                    } else {
                        const key = `others_${d._id}`;
                        grouped[key] = { latest: d, allIds: [d._id], orderNo, isOrderGroup: false };
                    }
                });

                const toBeProcessedData = Object.values(grouped)
                    .filter(g => !(g.orderNo && !g.isOrderGroup && grouped[g.orderNo]))
                    .map(g => ({
                        ...g.latest,
                        allIds: g.allIds,
                        successIds: (g.orderNo && g.isOrderGroup) ? orderToBatchIds[g.orderNo] : g.allIds
                    }))
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
                            break
                        } catch (e) {
                            lastError = e
                            console.log(`[WebhookController.jobProcessNewOrders] - process new order failed (attempt ${attempt}/${MAX_RETRIES})`, e.stack)
                        }
                        console.timeEnd(`[WebhookController.jobProcessNewOrders] - process new order ${data.order_number}`)

                    }
                    if (success) {
                        await WebhookEvent.updateMany(
                            { _id: { $in: data.successIds } },
                            { $set: { handle_status: StatusWebhookEnum.SUCCESS } }
                        )
                    } else {
                        await WebhookEvent.updateMany(
                            { _id: { $in: data.allIds } },
                            { $set: { handle_status: StatusWebhookEnum.FAILED, handle_error: lastError?.stack } }
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