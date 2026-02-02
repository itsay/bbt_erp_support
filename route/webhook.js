"use strict";
const express = require("express");
const router = express.Router({});
const WebhookController = require("./webhook/webhook.controller");

router.post('/', WebhookController.receiveWebhook)

module.exports = router;
