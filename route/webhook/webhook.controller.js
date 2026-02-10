const { WebhookEvent } = require('../../model/omisell')
const StatusWebhookEnum = require('../../common/enums/status-webhook.eum')
const MisaApiService = require('../../service/misa/api.service')
const Util = require('../util/util')

function WebhookController() {
    const SELF = {
        handleSyncOrder: () => {
        },
        PROCESS_NEW_ORDERS_LOCK: false,
    }
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
            if (SELF.PROCESS_NEW_ORDERS_LOCK) {
                console.log('[WebhookController.jobProcessNewOrders] - process new orders is locked');
                return;
            }
            SELF.PROCESS_NEW_ORDERS_LOCK = true
            try {
                const webhookData = await WebhookEvent.find({ handle_status: StatusWebhookEnum.PENDING }).limit(noOrders).lean()
                const successIds = []
                const failedIds = []
                for (const data of webhookData) {
                    let isSuccess = false
                    for (let retry = 1; retry <= 3; retry += 1) {
                        try {
                            console.time(`[WebhookController.jobProcessNewOrders] - process new order ${data.omisell_order_number}`)
                            await MisaApiService.processNewOrderFromWebhook(data)
                            console.timeEnd(`[WebhookController.jobProcessNewOrders] - process new order ${data.omisell_order_number}`)
                            isSuccess = true
                            break
                        } catch (e) {
                            console.log(`[WebhookController.jobProcessNewOrders] - process new order failed (attempt ${retry}/3)`, e.stack)
                            await Util.sleep(1000)
                        }
                    }

                    if (isSuccess) {
                        successIds.push(data._id)
                    } else {
                        failedIds.push(data._id)
                    }
                }

                if (successIds.length > 0) {
                    await WebhookEvent.updateMany(
                        { _id: { $in: successIds } },
                        { $set: { handle_status: StatusWebhookEnum.SUCCESS } }
                    )
                }

                if (failedIds.length > 0) {
                    await WebhookEvent.updateMany(
                        { _id: { $in: failedIds } },
                        { $set: { handle_status: StatusWebhookEnum.FAILED } }
                    )
                }
            } finally {
                SELF.PROCESS_NEW_ORDERS_LOCK = false
            }
            console.timeEnd('[WebhookController.jobProcessNewOrders] - jobProcessNewOrders')
        }
    }
}

module.exports = WebhookController();