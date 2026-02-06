require('dotenv').config(__dirname + '/../.env');
const mongoose = require("mongoose");
const { Order, PickupList, OrderDetail } = require('../model/omisell')

const AMIS_CRM_URL = process.env.AMIS_CRM_URL || 'https://amisapp.misa.vn/crm/gc/api/public/api/v2';
const AMIS_CLIENT_ID = process.env.AMIS_CRM_CLIENT_ID || '7cdf2ed77d6e92cf0c945d4bc1cbc1534caac2f0';
const AMIS_CLIENT_SECRET = process.env.AMIS_CRM_CLIENT_SECRET || 'yS68ZW7dFRGTrFuxaLqw7LW01Q7qgtENid04PnsVJBM=';
const AMIS_COMPANY_CODE = process.env.AMIS_COMPANY_CODE || '';
const AMIS_TENANT_ID = process.env.AMIS_TENANT_ID || '';
const accountTable = [
    { platform: 'Retail', shop_id: 29291, account_name: 'Khách hàng ECOM', account_number: 'KH10819', allowFeeShip: true },
    { platform: 'Shopee_v2', shop_id: 22931, account_name: 'Khách hàng Shopee', account_number: 'KH10665', allowFeeShip: false },
    { platform: 'Tiktok', shop_id: 22411, account_name: 'Khách hàng TikTok Shop', account_number: 'KH10799', allowFeeShip: true },
    { platform: 'Lazada', shop_id: 22853, account_name: 'Khách hàng Lazada', account_number: 'KH10798', allowFeeShip: true },
    { platform: 'Shopee_v2', shop_id: 33991, account_name: 'Khách hàng Shopee - Osaki', account_number: 'KH10663', allowFeeShip: false },
    { platform: 'Shopee_v2', shop_id: 33937, account_name: 'Khách hàng Shopee (Shop Vệ Tinh 1)', account_number: 'KH10876', allowFeeShip: false },
    { platform: 'Tiktok', shop_id: 34712, account_name: 'Khách hàng TikTok Shop - Osaki', account_number: 'KH11276', allowFeeShip: true },
    { platform: 'Shopee_v2', shop_id: 35431, account_name: 'Khách hàng Shopee (Shop Vệ Tinh 2)', account_number: 'KH11472', allowFeeShip: false },
]
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
    { warehouse_code: 'KHO40', warehouse_name: 'KHO TP AMAZON' }
]
const pay_status = {
    CHUA_THANH_TOAN: 'Chưa thanh toán',
    DA_THANH_TOAN: 'Đã thanh toán',
    DA_THANH_TOAN_MOI_PART: 'Đã thanh toán một phần',
}
const status = {
    CHUA_THUC_HIEN: 'Chưa thực hiện',
    DANG_THUC_HIEN: 'Đang thực hiện',
    DA_THUC_HIEN: 'Đã thực hiện',
    DA_HUY_BO: 'Đã hủy bỏ',
    DA_GIAO: 'Đã giao đủ hàng',
}

mongoose.set("strictQuery", true);
mongoose.Promise = global.Promise;

mongoose.connect(
    process.env.MONGODB,
    {
        ssl: false,
        tlsAllowInvalidCertificates: true,
        maxPoolSize: 15,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    },
    async (error) => {
        if (error) {
            console.log(`Connect mongodb for app fail: ${error.stack}`)
            return
        }
        console.log(`Connected mongodb for app`);
        await main()

        console.log('done')
    }
)

const getToken = async () => {
    try {
        const url = `${AMIS_CRM_URL}/Account`;
        const payload = { client_id: AMIS_CLIENT_ID, client_secret: AMIS_CLIENT_SECRET };
        const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        const data = await response.json();
        console.log(`[MisaJobController] - [getToken] - success: `, data);
        return data.data;
    } catch (error) {
        console.log(`[MisaJobController] - [getToken] - fail: `, error.stack);
        return Promise.reject(error);
    }
}

const normalizeUrl = (base) => {
    if (!base) return '';
    return base.endsWith('/') ? base.slice(0, -1) : base;
}


const toIso = (ts) => {
    if (!ts || ts <= 0) return null;
    return new Date(ts * 1000).toISOString();
}

const sale_order_type = {
    normal: 'Đơn hàng Omisell',
    sample: 'Mẫu thử',
    BAN_MOI: 'Bán mới',
    NANG_CAP: 'Nâng cấp',
    GIA_HAN: 'Gia hạn/Cập nhật',
    DICH_VU_DAO_TAO: 'Dịch vụ đào tạo',
    DICH_VU_TU_VAN_TRIEN_KHAI: 'Dịch vụ tư vấn triển khai',
    DICH_VU_KHAC: 'Dịch vụ khác',
}

const mapOmisellToCrmSaleOrder = (src, pickups = []) => {
    const omisellNo = src.omisell_order_number;
    console.log('omisell_order_number:', omisellNo);
    const parcels = Array.isArray(src.parcels) ? src.parcels : [];
    const firstParcel = parcels[0] || {};
    const inventoryItems = parcels.flatMap(p => Array.isArray(p.inventory_items) ? p.inventory_items : []);

    const getAccountName = (platform, shopId) => {
        const p = String(platform || '').toLowerCase();
        const s = Number(shopId || 0);
        const row = accountTable.find(r => String(r.platform || '').toLowerCase() === p && Number(r.shop_id || 0) === s);
        return row ? row.account_number : '';
    }

    const getAllowFeeShip = (platform, shopId) => {
        const p = String(platform || '').toLowerCase();
        const s = Number(shopId || 0);
        const row = accountTable.find(r => String(r.platform || '').toLowerCase() === p && Number(r.shop_id || 0) === s);
        return row ? row.allowFeeShip : false;
    }

    const receiver = src.receiver || {};
    const invoice = src.invoice_information || {};
    const list_product = [...new Set(inventoryItems.map(ii => (ii.inventory_sku || ii.catalogue_sku)).filter(Boolean))];

    const discount_summary = 0;
    /**Payment info */
    const paymentInfo = Array.isArray(src.payment_information) ? src.payment_information : [];

    const sale_order_date = paymentInfo.length
        ? new Date(Number(paymentInfo[0].transaction_time || 0) * 1000).toISOString().slice(0, 10)
        : null;
    const mappedAccountName = getAccountName(src.platform, src.shop_id);

    const pickupInfo = firstParcel?.pickup_id ? pickups.find(p => p.id === firstParcel.pickup_id) || {} : {};
    const warehouse_code = warehouses.find(w => w.warehouse_name.trim().toLowerCase() === pickupInfo.pickup_name.trim().toLowerCase())?.warehouse_code || '';

    const buildItem = (ii, idx) => {
        const inv = ii || {};
        const taxVal = inv.tax_vat;
        const quantity = Number(inv.quantity || 0);
        const priceAfterTax = Number(inv.sale_price || 0);
        const basePrice = inv.sale_price_before_tax; //đơn giá trước thuế
        const taxPercent = taxVal;
        const operator = 'Nhân';
        const discountValue = (() => {
            return 0;
        })();
        const discountPercent = 0;
        const toCurrency = basePrice * quantity;
        const toCurrencyOc = (priceAfterTax > 0)
            ? (priceAfterTax * quantity) / (1 + taxPercent / 100)
            : toCurrency;
        const discountOc = (taxPercent > 0)
            ? ((priceAfterTax * quantity) / (1 + taxPercent / 100)) * (discountPercent / 100)
            : discountValue;
        const taxOc = (taxPercent > 0) ? (toCurrencyOc * taxPercent / 100) : 0;
        const totalOc = toCurrencyOc - discountOc + taxOc;
        const toCurrencyAfterDiscount = toCurrency - discountValue;
        const toCurrencyOcAfterDiscount = toCurrencyOc - discountOc;

        const isGift = inv.sale_price === 0;
        return {
            product_code: (inv.inventory_sku || inv.catalogue_sku || '').trim().toUpperCase(),
            to_currency_oc: toCurrencyOc,
            total_oc: totalOc,
            description: inv.product_name || '',
            amount: quantity,
            price: basePrice, // đơn giá (trước thuế)
            usage_unit: '',
            discount: discountValue,
            discount_percent: Number(discountPercent.toFixed(2)),
            ratio: 1,
            tax: toCurrency * (taxVal / 100),
            operator,
            to_currency_oc_after_discount: toCurrencyOcAfterDiscount,
            usage_unit_amount: quantity,
            usage_unit_price: basePrice,
            is_promotion: isGift,
            description_product: inv.product_name || '',
            batch_number: '',
            expire_date: null,
            exist_amount: 0,
            discount_oc: discountOc,
            tax_oc: taxOc,
            to_currency: toCurrency,
            total: toCurrency * (1 + taxVal / 100),
            shipping_amount: quantity,
            price_after_tax: priceAfterTax,
            sort_order: idx + 1,
            height: 0,
            width: 0,
            length: 0,
            radius: 0,
            mass: 0,
            to_currency_after_discount: toCurrencyAfterDiscount,
            quantity_ordered: quantity,
            discounted_price: Number(inv.sale_price || 0),
            discounted_price_before_tax: Number(inv.sale_price_before_tax || 0),
            tax_percent: String(taxVal || 0) + '%',
            stock_name: warehouse_code || '',
        };
    };

    const sale_order_product_mappings = inventoryItems.map((ii, idx) => buildItem(ii, idx));
    const allowFeeShip = getAllowFeeShip(src.platform, src.shop_id);
    if (src?.shipping_information?.buyer_shipping_fee > 0 && allowFeeShip) {
        list_product.push("CP01");
        const feeShipTax = 0.08
        const feeShipAfterTax = src.shipping_information.buyer_shipping_fee
        const feeShipBeforeTax = Number((feeShipAfterTax / (1 + feeShipTax)).toFixed(2))

        sale_order_product_mappings.push({
            product_code: "CP01",
            tax_percent: String(feeShipTax * 100) + '%',
            to_currency: feeShipAfterTax,
            description: "Phí giao hàng",
            price: feeShipBeforeTax,
            amount: 1,
            shipping_amount: 1,
            unit: "Chuyến",
            price_after_tax: feeShipAfterTax,
            discount: 0,
            tax: feeShipBeforeTax * feeShipTax,
            total: feeShipAfterTax,
            sort_order: sale_order_product_mappings.length + 1,
        })
    }

    const sale_order_amount = sale_order_product_mappings.reduce((s, p) => s + p.total, 0);
    const shipping_amount_summary = sale_order_product_mappings.reduce((s, p) => s + p.amount, 0);
    const amount_summary = shipping_amount_summary

    const decideWard = (receiver) => {
        const districtLowerCased = receiver.district.toLowerCase()
        if (!receiver.subdistrict_id && (districtLowerCased.includes('phường') || districtLowerCased.includes('xã'))) {
            return receiver.district
        }
        return ''
    }

    const decideDistrict = (receiver) => {
        if (decideWard(receiver)) {
            return ''
        }
        return receiver.district
    }

    return {
        sale_order_no: src.order_number || null,
        other_sys_order_code: src.omisell_order_number || null,
        description: src.order_note || null,
        status: src?.status_name || status.CHUA_THUC_HIEN,
        shipping_code: firstParcel.package_number || receiver.zip_code || '',
        shipping_amount_summary,
        delivery_status: firstParcel.shipment_status_name || String(firstParcel.shipment_status || ''),
        list_product,
        amount_summary,
        discount_summary,
        pay_status: paymentInfo[0].transaction_status_name || pay_status.CHUA_THANH_TOAN,
        sale_order_amount: Number(sale_order_amount.toFixed(4)),
        total_summary: Number(sale_order_amount.toFixed(4)),
        sale_order_date,
        paid_date: sale_order_date,
        billing_account: mappedAccountName || invoice.fullname || '',
        billing_contact: '',
        billing_address: invoice.address || '',
        billing_code: '',
        billing_ward: '',
        billing_district: '',
        billing_province: '',
        billing_country: 'Việt Nam',
        shipping_contact_name: receiver.fullname || '',
        phone: receiver.phone || '',
        shipping_address: receiver.address || '',
        shipping_ward: decideWard(receiver),
        shipping_district: decideDistrict(receiver),
        shipping_province: receiver.province || '',
        shipping_country: 'Việt Nam',
        discount_overall: discount_summary,
        delivery_date: toIso(src.shipped_time || 0),
        form_layout: "Đơn hàng Omisell",
        sale_order_type: sale_order_type[src.order_type] || sale_order_type.sample,
        sale_order_product_mappings,
        account_name: mappedAccountName || '',
        sale_order_name: src.order_number || null,
    }
}


const addCrmObjects = async (select, items, token, clientId, crmUrl = AMIS_CRM_URL) => {
    try {
        console.log(`[MisaApiService] - [addCrmObjects] - select=${select} - token=${token}`);
        const base = normalizeUrl(crmUrl);
        if (!base) {
            console.log(`CRM add error: missing AMIS_CRM_URL`);
            return Promise.reject(new Error('CRM add error: missing AMIS_CRM_URL'));
        }

        const url = `${base}/${select}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Clientid': clientId,
                'Accept': 'application/json'
            },
            body: JSON.stringify(Array.isArray(items) ? items : [items])
        });
        const data = await response.json();
        console.log(`[MisaApiService] - [addCrmObjects] - data=${JSON.stringify(data)}`);
        if (!data?.success) {
            return Promise.reject(data);
        }
        return Promise.resolve(data?.results?.[0]?.data);
    } catch (error) {
        console.log(`[MisaApiService] - [addCrmObjects] - fail: `, error.stack);
        return Promise.reject(error);
    }
}


async function deleteCrmObjects(select, ids, token, clientId, crmUrl = AMIS_CRM_URL) {
    const base = normalizeUrl(crmUrl);
    if (!base) throw new Error('CRM delete error: missing AMIS_CRM_URL');
    const url = `${base}/${select}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Clientid': clientId,
        'CompanyCode': AMIS_COMPANY_CODE,
        'X-TenantId': AMIS_TENANT_ID,
        'Accept': 'application/json'
    };
    const maskedHeaders = Object.assign({}, headers, {
        Authorization: `Bearer ${String(token || '').slice(0, 6)}***${String(token || '').slice(-6)}`
    });
    const payload = Array.isArray(ids) ? ids : [ids];
    console.log('CRM Delete Request ->', { url, headers: maskedHeaders, idsCount: payload.length, sampleIds: payload.slice(0, 5) });
    const res = await fetch(url, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(payload)
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { success: false, code: res.status, body: text }; }
    if (!res.ok || (data && data.success === false)) {
        console.error('CRM Delete Response Error ->', { status: res.status, body: text });
    } else {
        console.log('CRM Delete Response OK ->', { status: res.status, success: data?.success });
    }
    if (data?.success) return data;
    if (res.ok && data) return data;
    const detail = typeof data === 'string' ? data : (data.message || data.messages || data.body || JSON.stringify(data));
    throw new Error(`CRM delete error: ${select} status=${res.status} detail=${detail}`);
}


async function pushOrdersToMisa(orderNos) {
    const token = await getToken()
    const [docs, pickups] = await Promise.all([
        Order.find({ misa_status: { $ne: "SUCCESS" }, omisell_order_number: { $in: orderNos } }).sort({ created_time: 1 }).lean(),
        PickupList.find().lean(),
    ]);

    let success = 0, fail = 0;
    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const orderNo = doc.omisell_order_number || doc.order_number;
        const sentAt = new Date();
        await Order.updateOne(
            { _id: doc._id },
            { $set: { misa_status: 'PENDING', misa_sent_time: sentAt } }
        );
        const detailDoc = await OrderDetail.findOne({ omisell_order_number: orderNo });
        if (!detailDoc) {
            console.log(`No detail found for order ${orderNo}`);
            continue;
        }
        const source = detailDoc || doc;
        let crmOrder
        try {
            crmOrder = mapOmisellToCrmSaleOrder(source, pickups);
            console.time(`Push ${orderNo}`);
            const misaId = await addCrmObjects('SaleOrders', [crmOrder], token, AMIS_CLIENT_ID, AMIS_CRM_URL);
            console.log(`Push SUCCESS | omisell_order_number=${orderNo} | misaId=${misaId}`);
            console.timeEnd(`Push ${orderNo}`);
            await Order.updateOne(
                { _id: doc._id },
                { $set: { misa_status: 'SUCCESS', misa_response: { misa_id: misaId }, misa_sent_time: sentAt, misa_body: crmOrder || '', misa_id: misaId } }
            );
            success++;
        } catch (err) {
            console.error(`Push FAIL | omisell_order_number=${orderNo} | error=${String(err)}`);
            await Order.updateOne(
                { _id: doc._id },
                { $set: { misa_status: 'FAIL', misa_response: { error: JSON.stringify(err) }, misa_sent_time: sentAt, misa_body: crmOrder } }
            );
            fail++;
        }
        if ((i + 1) % 10 === 0) {
            console.log(`Pushed ${i + 1}/${docs.length} orders to MISA | success=${success} fail=${fail}`);
        }
    }
    console.log(`Done pushing ${docs.length} orders | success=${success} fail=${fail}`);
}


async function main() {
    const token = await getToken()
    const orders = await Order.find({ misa_id: { $exists: true } }, { omisell_order_number: 1, order_number: 1, misa_id: 1 }).lean()
    const omisellNos = []
    const misaIds = []
    for (const order of orders) {
        if (order.omisell_order_number) {
            omisellNos.push(order.omisell_order_number)
        }
        if (order.misa_id) {
            misaIds.push(order.misa_id)
        }
    }
    // console.log('------------------------------------------------')
    // console.log('[main] update misa_status to PENDING')
    // await Order.updateMany({ misa_status: "SUCCESS" }, { $set: { misa_status: "PENDING" } })
    console.log('------------------------------------------------')
    console.log('[main] delete crm objects')
    await deleteCrmObjects('SaleOrders', misaIds, token, AMIS_CLIENT_ID)
    // console.log('------------------------------------------------')
    // console.log('[main] push orders to misa')
    // await pushOrdersToMisa(omisellNos)
}