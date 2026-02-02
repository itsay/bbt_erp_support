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


const _order = mongoose.model('bbt_omisell_orders', Order)
const _order_detail = mongoose.model('bbt_omisell_order_detail', OrderDetail)

module.exports = {
  Order: _order,
  OrderDetail: _order_detail
}
