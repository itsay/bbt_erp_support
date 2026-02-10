const { WebhookEvent } = require('../../model/omisell')
const StatusWebhookEnum = require('../../common/enums/status-webhook.eum')
const MisaApiService = require('../../service/misa/api.service')

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
        jobProcessNewOrders: async (noOrders = 20) => {
            if (SELF.PROCESS_NEW_ORDERS_LOCK) {
                console.log('[WebhookController.jobProcessNewOrders] - process new orders is locked');
                return;
            }
            SELF.PROCESS_NEW_ORDERS_LOCK = true;
            const webhookData = await WebhookEvent.find({ handle_status: StatusWebhookEnum.PENDING }).limit(noOrders).lean()
            for (const data of webhookData) {
                await MisaApiService.processNewOrderFromWebhook(data)
            }
            SELF.PROCESS_NEW_ORDERS_LOCK = false;
        }
    }
}

module.exports = WebhookController();