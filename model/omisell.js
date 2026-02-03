'use strict';
const mongoose = require('mongoose')

/** @class Order
 * @description
 */
const Order = mongoose.Schema({
}, { versionKey: false, timestamps: false, strict: false })

/** @class OrderDetail
 * @description
 */
const OrderDetail = mongoose.Schema({
}, { versionKey: false, timestamps: false, strict: false })


const OrderRevenue = mongoose.Schema({
}, { versionKey: false, timestamps: false, strict: false })


module.exports = {
  Order: mongoose.model('bbt_omisell_orders', Order),
  OrderDetail: mongoose.model('bbt_omisell_order_detail', OrderDetail),
  OrderRevenue: mongoose.model('bbt_omisell_order_revenue', OrderRevenue)
}
