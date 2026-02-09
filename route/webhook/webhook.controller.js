const { WebhookEvent } = require('../../model/omisell')
const StatusWebhookEnum = require('../../common/enums/status-webhook.eum')

function WebhookController() {
    return {
        receiveWebhook: async (req, res) => {
            console.log(`[receiveWebhook] - payload: ${JSON.stringify(req.body)}`);
            WebhookEvent.create({
                ...req.body,
                receivedAt: new Date(),
                status: StatusWebhookEnum.PENDING,
            }).catch((err) => {
                console.log(`[receiveWebhook] - saveTracking - fail: `, err.stack);
            })
            return res.json({ msg: "Webhook received" });
        }
    }
}

module.exports = new WebhookController();