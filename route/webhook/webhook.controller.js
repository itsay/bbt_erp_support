function WebhookController() {
    return {
        receiveWebhook: async (req, res) => {
            console.log(`[receiveWebhook] - payload: ${JSON.stringify(req.body)}`);
            return res.json({ msg: "Webhook received" });
        }
    }
}

module.exports = new WebhookController();