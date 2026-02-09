'use strict';
const mongoose = require('mongoose');

/**
 * MisaAccount - Quản lý bảng tài khoản theo platform/shop
 * (accountTable trong api.service.js)
 */
const MisaAccount = mongoose.Schema({
    platform: { type: String, required: true },
    shop_id: { type: Number, required: true },
    account_name: { type: String, required: true },
    account_number: { type: String, required: true },
    allowFeeShip: { type: Boolean, default: false },
}, { versionKey: false, timestamps: true });

MisaAccount.index({ platform: 1, shop_id: 1 }, { unique: true });

/**
 * MisaWarehouse - Quản lý danh sách kho
 * (warehouses trong api.service.js)
 */
const MisaWarehouse = mongoose.Schema({
    async_id: { type: String },
    warehouse_code: { type: String, required: true, unique: true },
    warehouse_name: { type: String, required: true },
}, { versionKey: false, timestamps: true });

MisaWarehouse.index({ async_id: 1 }, { unique: true, sparse: true });

/**
 * MisaEnum - Quản lý các danh mục enum (pay_status, status, sale_order_type)
 * category: 'pay_status' | 'status' | 'sale_order_type'
 */
const MisaEnum = mongoose.Schema({
    category: { type: String, required: true },
    key: { type: String, required: true },
    label: { type: String, required: true },
}, { versionKey: false, timestamps: true });

MisaEnum.index({ category: 1, key: 1 }, { unique: true });

module.exports = {
    MisaAccount: mongoose.model('bbt_misa_account', MisaAccount),
    MisaWarehouse: mongoose.model('bbt_misa_warehouse', MisaWarehouse),
    MisaEnum: mongoose.model('bbt_misa_enum', MisaEnum),
};
