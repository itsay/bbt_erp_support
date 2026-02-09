/**
 * Seed script: Chạy 1 lần để migrate dữ liệu hardcoded sang MongoDB.
 * Usage: node seed/misa-config-seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { MisaAccount, MisaWarehouse, MisaEnum } = require('../model/misa-config');

const MONGO_URI = process.env.MONGODB || 'mongodb://127.0.0.1:27017/bbt_erp';

const accounts = [
    { platform: 'Retail', shop_id: 29291, account_name: 'Khách hàng ECOM', account_number: 'KH10819', allowFeeShip: true },
    { platform: 'Shopee_v2', shop_id: 22931, account_name: 'Khách hàng Shopee', account_number: 'KH10665', allowFeeShip: false },
    { platform: 'Tiktok', shop_id: 22411, account_name: 'Khách hàng TikTok Shop', account_number: 'KH10799', allowFeeShip: true },
    { platform: 'Lazada', shop_id: 22853, account_name: 'Khách hàng Lazada', account_number: 'KH10798', allowFeeShip: true },
    { platform: 'Shopee_v2', shop_id: 33991, account_name: 'Khách hàng Shopee - Osaki', account_number: 'KH10663', allowFeeShip: false },
    { platform: 'Shopee_v2', shop_id: 33937, account_name: 'Khách hàng Shopee (Shop Vệ Tinh 1)', account_number: 'KH10876', allowFeeShip: false },
    { platform: 'Tiktok', shop_id: 34712, account_name: 'Khách hàng TikTok Shop - Osaki', account_number: 'KH11276', allowFeeShip: true },
    { platform: 'Shopee_v2', shop_id: 35431, account_name: 'Khách hàng Shopee (Shop Vệ Tinh 2)', account_number: 'KH11472', allowFeeShip: false },
];

const warehouses = [
    { warehouse_code: 'KHO25', warehouse_name: 'Kho Boxme Hà Nội' },
    { warehouse_code: 'KHO24', warehouse_name: 'Boxme Tân Tạo HCM' },
    { warehouse_code: 'KHO04', warehouse_name: 'KHO TP NT ÂU CƠ' },
    { warehouse_code: 'KHO08', warehouse_name: 'Kho hàng khuyến mãi' },
    { warehouse_code: 'KHO09', warehouse_name: 'Kho chờ sản xuất' },
    { warehouse_code: 'KHO10', warehouse_name: 'Kho chờ giao hàng BBT' },
    { warehouse_code: 'KHO11', warehouse_name: 'Kho nhà phân phối' },
    { warehouse_code: 'KHO20', warehouse_name: 'Kho TP Hàng Hóa' },
    { warehouse_code: 'KHO21', warehouse_name: 'Kho hàng mẫu' },
    { warehouse_code: 'KHO29', warehouse_name: 'KHO TP ĐÀ NẴNG' },
    { warehouse_code: 'KHO30', warehouse_name: 'KHO TP HẬU GIANG' },
    { warehouse_code: 'KHO31', warehouse_name: 'KHO THÀNH PHẨM CHÂU ĐỐC' },
    { warehouse_code: 'KHO35', warehouse_name: 'KHO TP ÂU CƠ' },
    { warehouse_code: 'KHO36', warehouse_name: 'Kho chờ giao hàng Âu Cơ' },
    { warehouse_code: 'KHO37', warehouse_name: 'Kho hàng tặng Khách Hàng' },
    { warehouse_code: 'KHO38', warehouse_name: 'KHO TP SHOWROOM ÂU CƠ' },
    { warehouse_code: 'KHO39', warehouse_name: 'Kho NVL Khách Cấp - Gia Công' },
    { warehouse_code: 'KHO40', warehouse_name: 'KHO TP AMAZON' },
];

const enums = [
    // pay_status
    { category: 'pay_status', key: 'CHUA_THANH_TOAN', label: 'Chưa thanh toán' },
    { category: 'pay_status', key: 'DA_THANH_TOAN', label: 'Đã thanh toán' },
    { category: 'pay_status', key: 'DA_THANH_TOAN_MOI_PART', label: 'Đã thanh toán một phần' },
    // status
    { category: 'status', key: 'CHUA_THUC_HIEN', label: 'Chưa thực hiện' },
    { category: 'status', key: 'DANG_THUC_HIEN', label: 'Đang thực hiện' },
    { category: 'status', key: 'DA_THUC_HIEN', label: 'Đã thực hiện' },
    { category: 'status', key: 'DA_HUY_BO', label: 'Đã hủy bỏ' },
    { category: 'status', key: 'DA_GIAO', label: 'Đã giao đủ hàng' },
    // sale_order_type
    { category: 'sale_order_type', key: 'normal', label: 'Đơn hàng Omisell' },
    { category: 'sale_order_type', key: 'sample', label: 'Mẫu thử' },
    { category: 'sale_order_type', key: 'BAN_MOI', label: 'Bán mới' },
    { category: 'sale_order_type', key: 'NANG_CAP', label: 'Nâng cấp' },
    { category: 'sale_order_type', key: 'GIA_HAN', label: 'Gia hạn/Cập nhật' },
    { category: 'sale_order_type', key: 'DICH_VU_DAO_TAO', label: 'Dịch vụ đào tạo' },
    { category: 'sale_order_type', key: 'DICH_VU_TU_VAN_TRIEN_KHAI', label: 'Dịch vụ tư vấn triển khai' },
    { category: 'sale_order_type', key: 'DICH_VU_KHAC', label: 'Dịch vụ khác' },
];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Upsert accounts
    for (const a of accounts) {
        await MisaAccount.updateOne(
            { platform: a.platform, shop_id: a.shop_id },
            { $set: a },
            { upsert: true }
        );
    }
    console.log(`Seeded ${accounts.length} accounts`);

    // Upsert warehouses
    for (const w of warehouses) {
        await MisaWarehouse.updateOne(
            { warehouse_code: w.warehouse_code },
            { $set: w },
            { upsert: true }
        );
    }
    console.log(`Seeded ${warehouses.length} warehouses`);

    // Upsert enums
    for (const e of enums) {
        await MisaEnum.updateOne(
            { category: e.category, key: e.key },
            { $set: e },
            { upsert: true }
        );
    }
    console.log(`Seeded ${enums.length} enums`);

    await mongoose.disconnect();
    console.log('Done!');
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
