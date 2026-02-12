const crypto = require('crypto');
const { Order, OrderDetail, PickupList, } = require('../../model/omisell')
const { MisaAccount, MisaWarehouse, MisaEnum } = require('../../model/misa-config')
const fs = require('fs');
const OmisellApiService = require('../omisell/api.service');
const StatusWebhook = require('../../common/enums/status-webhook.eum');


function MisaApiService() {
    const SELF = {
        LOCATION_MAPPING: JSON.parse(fs.readFileSync(`${__dirname}/../../location-misa.json`, 'utf-8')),
        AMIS_CRM_URL: process.env.AMIS_CRM_URL,
        AMIS_CLIENT_ID: process.env.AMIS_CLIENT_ID,
        AMIS_CLIENT_SECRET: process.env.AMIS_CLIENT_SECRET,
        PICKUP_LIST: [],
        accountTable: [],
        warehouses: [],
        pay_status: {},
        status: {},
        sale_order_type: {},
        /**
         * Load cấu hình từ database. Gọi trước khi xử lý đơn hàng.
         */
        loadConfig: async () => {
            const [accounts, warehouses, enums] = await Promise.all([
                MisaAccount.find({}).lean(),
                MisaWarehouse.find({}).lean(),
                MisaEnum.find({}).lean(),
            ]);
            SELF.accountTable = accounts.map(a => ({
                platform: a.platform,
                shop_id: a.shop_id,
                account_name: a.account_name,
                account_number: a.account_number,
                allowFeeShip: a.allowFeeShip,
            }));
            SELF.warehouses = warehouses.map(w => ({
                warehouse_code: w.warehouse_code,
                warehouse_name: w.warehouse_name,
            }));
            SELF.pay_status = {};
            SELF.status = {};
            SELF.sale_order_type = {};
            for (const e of enums) {
                if (e.category === 'pay_status') SELF.pay_status[e.key] = e.label;
                else if (e.category === 'status') SELF.status[e.key] = e.label;
                else if (e.category === 'sale_order_type') SELF.sale_order_type[e.key] = e.label;
            }
            console.log(`[MisaApiService] Config loaded: ${accounts.length} accounts, ${warehouses.length} warehouses, ${enums.length} enums`);
            SELF.PICKUP_LIST = await PickupList.find().lean()
        },
        mapShippingAddress: (shipping) => {
            const normalizeKey = (s) => {
                if (!s) return '';
                let t = String(s);
                t = fixVietnameseTone(t).normalize('NFC').toLowerCase();
                // replace common separators/punctuations with space
                t = t.replace(/['’]/g, ''); // unify apostrophes by removing
                t = t.replace(/[-_.]/g, ' ');
                // collapse non-letter punctuation
                t = t.replace(/[^\p{L}\p{N}\s]/gu, ' ');
                t = t.replace(/\s+/g, ' ').trim();
                return t;
            }
            const stripAdminPrefixes = (s) => {
                let t = s;
                // remove common admin words at start
                t = t.replace(/^(tỉnh|thành phố|tp|tp\.|quận|huyện|thị xã|thị trấn|xã|phường)\s+/i, '').trim();
                return t;
            }
            const toAscii = (s) => {
                let t = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                t = t.replace(/đ/gi, 'd'); // map đ/Đ to d
                return t;
            }
            const tokenize = (s) => {
                return normalizeKey(s).split(' ').filter(Boolean);
            }
            const compactKey = (s) => {
                return stripAdminPrefixes(normalizeKey(s)).replace(/\s+/g, '');
            }
            const compactAsciiKey = (s) => {
                return stripAdminPrefixes(normalizeKey(toAscii(s))).replace(/\s+/g, '');
            }
            const romanToIntToken = (tok) => {
                const map = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
                return map[tok] ? String(map[tok]) : tok.replace(/^0+/, '') || tok;
            }
            const normalizeTokens = (arr) => {
                return arr.map(t => {
                    const ascii = toAscii(t);
                    const roman = romanToIntToken(ascii);
                    let out = roman.toLowerCase();
                    // normalize 'qui' -> 'quy'
                    if (out === 'qui') out = 'quy';
                    // normalize j -> y (e.g., 'jang' ~ 'yang')
                    out = out.replace(/j/g, 'y');
                    return out;
                });
            }
            const tokensEqual = (a, b) => {
                const aa = normalizeTokens(a);
                const bb = normalizeTokens(b);
                if (aa.length !== bb.length) return false;
                for (let i = 0; i < aa.length; i++) { if (aa[i] !== bb[i]) return false; }
                return true;
            }
            const matchByTokens = (input, candidates) => {
                const inTokens = tokenize(input);
                for (let i = 0; i < candidates.length; i++) {
                    const c = candidates[i];
                    const cTokens = tokenize(c.text);
                    const ok = inTokens.every(tok => cTokens.includes(tok)) || tokensEqual(inTokens, cTokens);
                    if (ok) return c;
                }
                return null;
            }
            const fixVietnameseTone = (input) => {
                if (!input || typeof input !== 'string') return input;
                let s = input.normalize('NFC');
                // oa: move tone to 'o'
                s = s.replaceAll('oà', 'òa')
                    .replaceAll('oá', 'óa')
                    .replaceAll('oả', 'ỏa')
                    .replaceAll('oã', 'õa')
                    .replaceAll('oạ', 'ọa')
                    .replaceAll('Oà', 'Òa')
                    .replaceAll('Oá', 'Óa')
                    .replaceAll('Oả', 'Ỏa')
                    .replaceAll('Oã', 'Õa')
                    .replaceAll('Oạ', 'Ọa');
                // oe: move tone to 'o'
                s = s.replaceAll('oè', 'òe')
                    .replaceAll('oé', 'óe')
                    .replaceAll('oẻ', 'ỏe')
                    .replaceAll('oẽ', 'õe')
                    .replaceAll('oẹ', 'ọe')
                    .replaceAll('Oè', 'Òe')
                    .replaceAll('Oé', 'Óe')
                    .replaceAll('Oẻ', 'Ỏe')
                    .replaceAll('Oẽ', 'Õe')
                    .replaceAll('Oẹ', 'Ọe');
                // uy: move tone to 'y'
                s = s.replaceAll('ùy', 'uỳ')
                    .replaceAll('úy', 'uý')
                    .replaceAll('ũy', 'uỹ')
                    .replaceAll('ụy', 'uỵ')
                    .replaceAll('Ùy', 'Uỳ')
                    .replaceAll('Úy', 'Uý')
                    .replaceAll('Ũy', 'Uỹ')
                    .replaceAll('Ụy', 'Uỵ');
                return s.normalize('NFC');
            }
            const pickFirstDefined = (...vals) => {
                for (const v of vals) { if (v !== undefined && v !== null && v !== '') return v; }
                return '';
            }
            const mapOne = (idx, shipping) => {
                const provinceIn = pickFirstDefined(shipping?.receiver?.province, shipping?.province);
                const districtIn = pickFirstDefined(shipping?.receiver?.district, shipping?.district);
                const wardIn = pickFirstDefined(shipping?.receiver?.subdistrict_name, shipping?.subdistrict_name, shipping?.receiver?.commune);

                const pKey = stripAdminPrefixes(normalizeKey(provinceIn));
                const pAsciiKey = stripAdminPrefixes(normalizeKey(toAscii(provinceIn)));
                // try direct match and common aliases
                let pHit = idx.pIndex.get(pKey) || idx.pAscii.get(pAsciiKey);
                if (!pHit) {
                    const PROVINCE_INPUT_ALIASES = {
                        'thua thien hue': ['huế', 'hue'],
                        'tp hue': ['huế', 'hue'],
                    };
                    const aliasCandidates = PROVINCE_INPUT_ALIASES[pAsciiKey] || PROVINCE_INPUT_ALIASES[pKey] || [];
                    for (const alias of aliasCandidates) {
                        const aliasKey = stripAdminPrefixes(normalizeKey(alias));
                        const aliasAscii = stripAdminPrefixes(normalizeKey(toAscii(alias)));
                        pHit = idx.pIndex.get(aliasKey) || idx.pAscii.get(aliasAscii);
                        if (pHit) break;
                    }
                }
                if (!pHit && Array.isArray(idx.provinces)) {
                    const asciiKey = pAsciiKey;
                    const prov = idx.provinces.find(p => {
                        const pAscii = stripAdminPrefixes(normalizeKey(toAscii(p.text)));
                        return pAscii.includes(asciiKey) || asciiKey.includes(pAscii);
                    });
                    if (prov) pHit = prov;
                    if (!pHit) {
                        const prov2 = matchByTokens(provinceIn, idx.provinces);
                        if (prov2) pHit = prov2;
                    }
                }
                let dHit = null, wHit = null;
                if (pHit) {
                    const dMap = idx.dIndex.get(pHit.id);
                    const dAsciiMap = idx.dAscii.get(pHit.id);
                    const dKey = stripAdminPrefixes(normalizeKey(districtIn));
                    const dAsciiKey = stripAdminPrefixes(normalizeKey(toAscii(districtIn)));
                    const dKeyCompact = stripAdminPrefixes(normalizeKey(districtIn)).replace(/\s+/g, '');
                    const dAsciiKeyCompact = stripAdminPrefixes(normalizeKey(toAscii(districtIn))).replace(/\s+/g, '');
                    dHit = (dMap?.get(dKey)) || (dAsciiMap?.get(dAsciiKey)) || (dMap?.get(dKeyCompact)) || (dAsciiMap?.get(dAsciiKeyCompact)) || null;
                    if (!dHit && Array.isArray(pHit.districts)) {
                        const asciiKey = dAsciiKey;
                        const dist = pHit.districts.find(d => {
                            const dAscii = stripAdminPrefixes(normalizeKey(toAscii(d.text)));
                            return dAscii.includes(asciiKey) || asciiKey.includes(dAscii);
                        });
                        if (dist) dHit = dist;
                        if (!dHit) {
                            const dist2 = matchByTokens(districtIn, pHit.districts);
                            if (dist2) dHit = dist2;
                        }
                    }
                    if (dHit) {
                        const wMap = idx.wIndex.get(dHit.id);
                        const wAsciiMap = idx.wAscii.get(dHit.id);
                        const wKey = stripAdminPrefixes(normalizeKey(wardIn));
                        const wAsciiKey = stripAdminPrefixes(normalizeKey(toAscii(wardIn)));
                        const wKeyCompact = stripAdminPrefixes(normalizeKey(wardIn)).replace(/\s+/g, '');
                        const wAsciiKeyCompact = stripAdminPrefixes(normalizeKey(toAscii(wardIn))).replace(/\s+/g, '');
                        wHit = (wMap?.get(wKey)) || (wAsciiMap?.get(wAsciiKey)) || (wMap?.get(wKeyCompact)) || (wAsciiMap?.get(wAsciiKeyCompact)) || null;
                        if (!wHit && Array.isArray(dHit.wards)) {
                            const asciiKey = wAsciiKey;
                            const ward = dHit.wards.find(w => {
                                const wAscii = stripAdminPrefixes(normalizeKey(toAscii(w.text)));
                                return wAscii.includes(asciiKey) || asciiKey.includes(wAscii);
                            });
                            if (ward) wHit = ward;
                            if (!wHit) {
                                const wTok = matchByTokens(wardIn, dHit.wards);
                                if (wTok) wHit = wTok;
                            }
                        }
                        if (!wHit && Array.isArray(pHit.districts)) {
                            for (let k = 0; k < pHit.districts.length && !wHit; k++) {
                                const d2 = pHit.districts[k];
                                const wMap2 = idx.wIndex.get(d2.id);
                                const wAsciiMap2 = idx.wAscii.get(d2.id);
                                const wKey2 = stripAdminPrefixes(normalizeKey(wardIn));
                                const wAsciiKey2 = stripAdminPrefixes(normalizeKey(toAscii(wardIn)));
                                let wCandidate = (wMap2?.get(wKey2)) || (wAsciiMap2?.get(wAsciiKey2)) || null;
                                if (!wCandidate && Array.isArray(d2.wards)) {
                                    const wCandidateAscii = d2.wards.find(w => {
                                        const wAscii = stripAdminPrefixes(normalizeKey(toAscii(w.text)));
                                        return wAscii.includes(wAsciiKey2) || wAsciiKey2.includes(wAscii);
                                    });
                                    if (wCandidateAscii) wCandidate = wCandidateAscii;
                                    if (!wCandidate) {
                                        const wTok = matchByTokens(wardIn, d2.wards);
                                        if (wTok) wCandidate = wTok;
                                    }
                                }
                                if (wCandidate) {
                                    wHit = wCandidate;
                                    dHit = d2;
                                }
                            }
                        }
                    }
                }
                return {
                    province: pHit ? { id: pHit.id, text: pHit.text } : null,
                    district: dHit ? { id: dHit.id, text: dHit.text } : null,
                    ward: wHit ? { id: wHit.id, text: wHit.text } : null,
                };
            }
            const buildLocationIndex = () => {
                const loc = SELF.LOCATION_MAPPING;
                const provinces = loc.provinces || [];
                const pIndex = new Map();
                const pAscii = new Map();
                const dIndex = new Map(); // provinceId -> Map
                const dAscii = new Map();
                const wIndex = new Map(); // districtId -> Map
                const wAscii = new Map();
                for (const p of provinces) {
                    const pKey = stripAdminPrefixes(normalizeKey(p.text));
                    const pAsciiKey = stripAdminPrefixes(normalizeKey(toAscii(p.text)));
                    pIndex.set(pKey, p);
                    pAscii.set(pAsciiKey, p);
                    // province aliases
                    const PROVINCE_ALIASES = {
                        'thua thien hue': ['huế', 'hue'],
                    };
                    const aliasList = PROVINCE_ALIASES[pAsciiKey];
                    if (aliasList?.length) {
                        for (const aliasName of aliasList) {
                            const aliasKey = stripAdminPrefixes(normalizeKey(aliasName));
                            const aliasAsciiKey = stripAdminPrefixes(normalizeKey(toAscii(aliasName)));
                            pIndex.set(aliasKey, p);
                            pAscii.set(aliasAsciiKey, p);
                        }
                    }
                    const dMap = new Map();
                    const dMapAscii = new Map();
                    for (const d of (p.districts || [])) {
                        const dKey = stripAdminPrefixes(normalizeKey(d.text));
                        dMap.set(dKey, d);
                        dMapAscii.set(stripAdminPrefixes(normalizeKey(toAscii(d.text))), d);
                        // compact variants to handle "a na" vs "ana"
                        dMap.set(compactKey(d.text), d);
                        dMapAscii.set(compactAsciiKey(d.text), d);
                        // add alias variants (apostrophe removed)
                        const dKeyNoApos = stripAdminPrefixes(normalizeKey(d.text.replace(/['’]/g, '')));
                        dMap.set(dKeyNoApos, d);
                        const dAsciiNoApos = stripAdminPrefixes(normalizeKey(toAscii(d.text.replace(/['’]/g, ''))));
                        dMapAscii.set(dAsciiNoApos, d);
                        const wMap = new Map();
                        const wMapAscii = new Map();
                        for (const w of (d.wards || [])) {
                            const wKey = stripAdminPrefixes(normalizeKey(w.text));
                            wMap.set(wKey, w);
                            wMapAscii.set(stripAdminPrefixes(normalizeKey(toAscii(w.text))), w);
                            // compact variants
                            wMap.set(compactKey(w.text), w);
                            wMapAscii.set(compactAsciiKey(w.text), w);
                            // alias variants for wards
                            const wKeyNoApos = stripAdminPrefixes(normalizeKey(w.text.replace(/['’]/g, '')));
                            wMap.set(wKeyNoApos, w);
                            const wAsciiNoApos = stripAdminPrefixes(normalizeKey(toAscii(w.text.replace(/['’]/g, ''))));
                            wMapAscii.set(wAsciiNoApos, w);
                            const wTokens = tokenize(w.text);
                            const wTokensNorm = normalizeTokens(wTokens);
                            const wKeyNumeral = wTokensNorm.join(' ');
                            wMap.set(wKeyNumeral, w);
                            const wAsciiTokens = tokenize(toAscii(w.text));
                            const wAsciiTokensNorm = normalizeTokens(wAsciiTokens);
                            const wAsciiKeyNumeral = wAsciiTokensNorm.join(' ');
                            wMapAscii.set(wAsciiKeyNumeral, w);
                        }
                        wIndex.set(d.id, wMap);
                        wAscii.set(d.id, wMapAscii);
                    }
                    dIndex.set(p.id, dMap);
                    dAscii.set(p.id, dMapAscii);
                }
                const idx = { pIndex, pAscii, dIndex, dAscii, wIndex, wAscii };
                idx.provinces = SELF.LOCATION_MAPPING.provinces || [];
                return idx;
            }
            const idx = buildLocationIndex();
            const res = mapOne(idx, shipping);
            return res;
        },
        getToken: async () => {
            try {
                const url = `${SELF.AMIS_CRM_URL}/Account`;
                const payload = { client_id: SELF.AMIS_CLIENT_ID, client_secret: SELF.AMIS_CLIENT_SECRET };
                const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };

                const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
                const data = await response.json();
                console.log(`[MisaJobController] - [getToken] - success: `, data);
                return data.data;
            } catch (error) {
                console.log(`[MisaJobController] - [getToken] - fail: `, error.stack);
                return Promise.reject(error);
            }
        },
        toIso: (ts) => {
            if (!ts || ts <= 0) return null;
            return new Date(ts * 1000).toISOString();
        },
        mapOmisellToCrmSaleOrder: (src, pickups = []) => {
            const clog = (msg, ...args) => console.log(`[MisaApiService.mapOmisellToCrmSaleOrder] ${msg}`, ...args);
            const omisellNo = src.omisell_order_number;
            console.log('[mapOmisellToCrmSaleOrder] - omisell_order_number:', omisellNo);
            const parcels = Array.isArray(src.parcels) ? src.parcels : [];
            const firstParcel = parcels[0] || {};
            const inventoryItems = parcels.flatMap(p => Array.isArray(p.inventory_items) ? p.inventory_items : []);

            const getAccountName = (platform, shopId) => {
                const p = String(platform || '').toLowerCase();
                const s = Number(shopId || 0);
                const row = SELF.accountTable.find(r => String(r.platform || '').toLowerCase() === p && Number(r.shop_id || 0) === s);
                return row ? row.account_number : '';
            }

            const getAllowFeeShip = (platform, shopId) => {
                const p = String(platform || '').toLowerCase();
                const s = Number(shopId || 0);
                const row = SELF.accountTable.find(r => String(r.platform || '').toLowerCase() === p && Number(r.shop_id || 0) === s);
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
            const warehouse_code = SELF.warehouses.find(w => w.warehouse_name.trim().toLowerCase() === pickupInfo.pickup_name.trim().toLowerCase())?.warehouse_code || '';

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

            const shippingPayload = SELF.mapShippingAddress(src)

            return {
                sale_order_no: src.order_number || null,
                other_sys_order_code: src.omisell_order_number || null,
                description: src.order_note || null,
                status: src?.status_name || '',
                shipping_code: firstParcel.package_number || receiver.zip_code || '',
                shipping_amount_summary,
                delivery_status: firstParcel.shipment_status_name || String(firstParcel.shipment_status || ''),
                list_product,
                amount_summary,
                discount_summary,
                pay_status: paymentInfo[0].transaction_status_name || '',
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
                shipping_ward: shippingPayload.ward.text || '',
                shipping_district: shippingPayload.district.text || '',
                shipping_province: shippingPayload.province.text || '',
                shipping_country: 'Việt Nam',
                discount_overall: discount_summary,
                delivery_date: SELF.toIso(src.shipped_time || 0),
                form_layout: "Đơn hàng Omisell",
                sale_order_type: SELF.sale_order_type[src.order_type] || SELF.sale_order_type.sample,
                sale_order_product_mappings,
                account_name: mappedAccountName || '',
                sale_order_name: src.order_number || null,
            }
        },
        normalizeUrl: (base) => {
            if (!base) return '';
            return base.endsWith('/') ? base.slice(0, -1) : base;
        },
        addCrmObjects: async ({ select, items, token, clientId, crmUrl = SELF.AMIS_CRM_URL }) => {
            try {
                console.log(`[MisaApiService] - [addCrmObjects] - select=${select} - token=${token}`);
                const base = SELF.normalizeUrl(crmUrl);
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
        },
        updateCrmObjects: async ({ select, items, token, clientId, crmUrl = SELF.AMIS_CRM_URL }) => {
            try {
                console.log(`[MisaApiService] - [updateCrmObjects] - select=${select} - token=${token}`);
                const base = SELF.normalizeUrl(crmUrl);
                if (!base) {
                    console.log(`CRM update error: missing AMIS_CRM_URL`);
                    return Promise.reject(new Error('CRM update error: missing AMIS_CRM_URL'));
                }

                const url = `${base}/${select}`;
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Clientid': clientId,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(Array.isArray(items) ? items : [items])
                });
                const data = await response.json();
                console.log(`[MisaApiService] - [updateCrmObjects] - data=${JSON.stringify(data)}`);
                if (!data?.success) {
                    return Promise.reject(data);
                }
                return Promise.resolve(data?.results?.[0]?.data);
            } catch (error) {
                console.log(`[MisaApiService] - [updateCrmObjects] - fail: `, error.stack);
                return Promise.reject(error);
            }
        },
        deleteCrmObjects: async ({ select, items, token, clientId, crmUrl = SELF.AMIS_CRM_URL }) => {
            try {
                console.log(`[MisaApiService] - [deleteCrmObjects] - select=${select} - token=${token}`);
                const base = SELF.normalizeUrl(crmUrl);
                if (!base) {
                    console.log(`CRM delete error: missing AMIS_CRM_URL`);
                    return Promise.reject(new Error('CRM delete error: missing AMIS_CRM_URL'));
                }

                const url = `${base}/${select}`;
                const response = await fetch(url, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Clientid': clientId,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(Array.isArray(items) ? items : [items])
                });
                const data = await response.json();
                console.log(`[MisaApiService] - [deleteCrmObjects] - data=${JSON.stringify(data)}`);
                if (!data?.success) {
                    return Promise.reject(data);
                }
                return Promise.resolve(data?.results?.[0]?.data);
            } catch (error) {
                console.log(`[MisaApiService] - [deleteCrmObjects] - fail: `, error.stack);
                return Promise.reject(error);
            }
        },
    }
    return {
        loadConfig: SELF.loadConfig,
        processNewOrders: async () => {
            await SELF.loadConfig();
            const token = await SELF.getToken()
            const [docs, pickups] = await Promise.all([
                Order.find({ misa_status: { $ne: StatusWebhook.SUCCESS } }).sort({ created_time: 1 }).lean(),
                PickupList.find().lean(),
            ]);
            let success = 0, fail = 0;
            for (let i = 0; i < docs.length; i++) {
                const doc = docs[i];
                const orderNo = doc.omisell_order_number || doc.order_number;
                const sentAt = new Date();
                await Order.updateOne(
                    { _id: doc._id },
                    { $set: { misa_status: StatusWebhook.PENDING, misa_sent_time: sentAt } }
                );
                let detailDoc = await OrderDetail.findOne({ omisell_order_number: orderNo });
                if (!detailDoc || !detailDoc?.created_time) {
                    // Lấy lại order detail
                    console.log(`No detail found for order ${orderNo}`);
                    let detail = await OmisellApiService.getOrderDetail(orderNo);
                    if (detail?.data?.retry_after) {
                        console.log('wait after', detail?.data?.retry_after);
                        await Util.sleep(Number(detail.data.retry_after) + 1);
                        detail = await OmisellApiService.getOrderDetail(orderNo);
                    }
                    console.log('Get details for ', orderNo)
                    await OrderDetail.updateOne(
                        { omisell_order_number: orderNo },
                        { $set: { omisell_order_number: orderNo, ...detail?.data, fetchedAt: new Date() } },
                        { upsert: true }
                    );
                    detailDoc = await OrderDetail.findOne({ omisell_order_number: orderNo });
                }
                const source = detailDoc || doc;
                let crmOrder
                try {
                    crmOrder = SELF.mapOmisellToCrmSaleOrder(source, pickups);
                    console.time(`Push ${orderNo}`);
                    const misaId = await SELF.addCrmObjects({
                        select: 'SaleOrders',
                        items: [crmOrder],
                        token,
                        clientId: SELF.AMIS_CLIENT_ID,
                        crmUrl: SELF.AMIS_CRM_URL
                    });
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
        },
        addWarehouse: async ({ warehouse_code, warehouse_name, async_id }) => {
            await SELF.loadConfig();
            const token = await SELF.getToken();

            const newWarehouse = {
                act_database_id: "",
                async_id: async_id || crypto.randomUUID(),
                description: `Thêm mới kho hàng ${warehouse_name}`,
                inactive: false,
                stock_code: warehouse_code,
                stock_name: warehouse_name
            };

            try {
                const result = await SELF.addCrmObjects({
                    select: 'Stocks',
                    items: [newWarehouse],
                    token,
                    clientId: SELF.AMIS_CLIENT_ID,
                    crmUrl: SELF.AMIS_CRM_URL
                });
                console.log(`[addWarehouse] SUCCESS | result=${JSON.stringify(result)}`);
                return result;
            } catch (err) {
                console.error(`[addWarehouse] FAIL | error=${JSON.stringify(err)}`);
                throw err;
            }
        },
        updateWarehouse: async ({ async_id, warehouse_code, warehouse_name, inactive = false }) => {
            await SELF.loadConfig();
            const token = await SELF.getToken();

            const warehouseUpdate = {
                act_database_id: "",
                async_id: async_id || crypto.randomUUID(),
                description: `Cap nhat kho hang ${warehouse_name || warehouse_code}`,
                inactive: Boolean(inactive),
                stock_code: warehouse_code,
                stock_name: warehouse_name
            };

            try {
                const result = await SELF.updateCrmObjects({
                    select: 'Stocks',
                    items: [warehouseUpdate],
                    token,
                    clientId: SELF.AMIS_CLIENT_ID,
                    crmUrl: SELF.AMIS_CRM_URL
                });
                console.log(`[updateWarehouse] SUCCESS | result=${JSON.stringify(result)}`);
                return result;
            } catch (err) {
                console.error(`[updateWarehouse] FAIL | error=${JSON.stringify(err)}`);
                throw err;
            }
        },
        deleteWarehouse: async ({ async_id }) => {
            await SELF.loadConfig();
            const token = await SELF.getToken();

            if (!async_id) {
                throw new Error('deleteWarehouse error: missing async_id');
            }

            try {
                const result = await SELF.deleteCrmObjects({
                    select: 'Stocks',
                    items: [{ async_id }],
                    token,
                    clientId: SELF.AMIS_CLIENT_ID,
                    crmUrl: SELF.AMIS_CRM_URL
                });
                console.log(`[deleteWarehouse] SUCCESS | result=${JSON.stringify(result)}`);
                return result;
            } catch (err) {
                console.error(`[deleteWarehouse] FAIL | error=${JSON.stringify(err)}`);
                throw err;
            }
        },

        createOrder: async () => {
            try {
                await SELF.addCrmObjects({ select: 'SaleOrders', items, token, clientId, crmUrl })
            } catch (error) {
                console.log(`[MisaApiService] - [createOrder] - fail: `, error.stack);
                return Promise.reject(error);
            }
        },
        testUpdateOrder: async () => {
            try {
                await SELF.loadConfig();
                const token = await SELF.getToken()
                const crmOrder = {
                    "id": "51049",
                    "sale_order_no": "2602060HAQXEQK",
                    "other_sys_order_code": "OV2602064DE279CB",
                    "description": null,
                    "status": "Giao hàng thành công",
                    "shipping_code": "1",
                    "shipping_amount_summary": 7,
                    "delivery_status": "Đang vận chuyển",
                    "list_product": [
                        "21-TT046",
                        "25-TT008",
                        "25-TT001"
                    ],
                    "amount_summary": 7,
                    "discount_summary": 0,
                    "pay_status": "Đã thanh toán",
                    "sale_order_amount": 222780.0024,
                    "total_summary": 222780.0024,
                    "sale_order_date": "2026-02-05",
                    "paid_date": "2026-02-05",
                    "billing_account": "KH10665",
                    "billing_contact": "",
                    "billing_address": "",
                    "billing_code": "",
                    "billing_ward": "",
                    "billing_district": "",
                    "billing_province": "",
                    "billing_country": "Việt Nam",
                    "shipping_contact_name": "T******g",
                    "phone": "+840000099",
                    "shipping_address": "******7, Lò Đúc, Phường Đống Mác, Quận Hai Bà Trưng, Hà Nội",
                    "shipping_ward": "Phường Bách Khoa",
                    "shipping_district": "Quận Hai Bà Trưng",
                    "shipping_province": "Hà Nội",
                    "shipping_country": "Việt Nam",
                    "discount_overall": 0,
                    "delivery_date": "2026-02-06T04:52:26.000Z",
                    "form_layout": "Đơn hàng Omisell",
                    "sale_order_type": "Đơn hàng Omisell",
                    "sale_order_product_mappings": [
                        {
                            "product_code": "21-TT046",
                            "to_currency_oc": 206277.77777777775,
                            "total_oc": 222779.99999999997,
                            "description": "Bông làm sạch da tròn 3D Calla 200 miếng/gói",
                            "amount": 3,
                            "price": 68759.26,
                            "usage_unit": "",
                            "discount": 0,
                            "discount_percent": 0,
                            "ratio": 1,
                            "tax": 16502.2224,
                            "operator": "Nhân",
                            "to_currency_oc_after_discount": 206277.77777777775,
                            "usage_unit_amount": 3,
                            "usage_unit_price": 68759.26,
                            "is_promotion": false,
                            "description_product": "Bông làm sạch da tròn 3D Calla 200 miếng/gói",
                            "batch_number": "",
                            "expire_date": null,
                            "exist_amount": 0,
                            "discount_oc": 0,
                            "tax_oc": 16502.22222222222,
                            "to_currency": 206277.77999999997,
                            "total": 222780.00239999997,
                            "shipping_amount": 3,
                            "price_after_tax": 74260,
                            "sort_order": 1,
                            "height": 0,
                            "width": 0,
                            "length": 0,
                            "radius": 0,
                            "mass": 0,
                            "to_currency_after_discount": 206277.77999999997,
                            "quantity_ordered": 3,
                            "discounted_price": 74260,
                            "discounted_price_before_tax": 68759.26,
                            "tax_percent": "8%",
                            "stock_name": "KHO24"
                        },
                        {
                            "product_code": "25-TT008",
                            "to_currency_oc": 0,
                            "total_oc": 0,
                            "description": "Bông tẩy trang Calla Dạng túi 10 miếng/gói",
                            "amount": 2,
                            "price": 0,
                            "usage_unit": "",
                            "discount": 0,
                            "discount_percent": 0,
                            "ratio": 1,
                            "tax": 0,
                            "operator": "Nhân",
                            "to_currency_oc_after_discount": 0,
                            "usage_unit_amount": 2,
                            "usage_unit_price": 0,
                            "is_promotion": true,
                            "description_product": "Bông tẩy trang Calla Dạng túi 10 miếng/gói",
                            "batch_number": "",
                            "expire_date": null,
                            "exist_amount": 0,
                            "discount_oc": 0,
                            "tax_oc": 0,
                            "to_currency": 0,
                            "total": 0,
                            "shipping_amount": 2,
                            "price_after_tax": 0,
                            "sort_order": 2,
                            "height": 0,
                            "width": 0,
                            "length": 0,
                            "radius": 0,
                            "mass": 0,
                            "to_currency_after_discount": 0,
                            "quantity_ordered": 2,
                            "discounted_price": 0,
                            "discounted_price_before_tax": 0,
                            "tax_percent": "0%",
                            "stock_name": "KHO24"
                        },
                        {
                            "product_code": "25-TT001",
                            "to_currency_oc": 0,
                            "total_oc": 0,
                            "description": "Bông làm sạch da Tròn 3D (30 miếng/gói)",
                            "amount": 2,
                            "price": 0,
                            "usage_unit": "",
                            "discount": 0,
                            "discount_percent": 0,
                            "ratio": 1,
                            "tax": 0,
                            "operator": "Nhân",
                            "to_currency_oc_after_discount": 0,
                            "usage_unit_amount": 2,
                            "usage_unit_price": 0,
                            "is_promotion": true,
                            "description_product": "Bông làm sạch da Tròn 3D (30 miếng/gói)",
                            "batch_number": "",
                            "expire_date": null,
                            "exist_amount": 0,
                            "discount_oc": 0,
                            "tax_oc": 0,
                            "to_currency": 0,
                            "total": 0,
                            "shipping_amount": 2,
                            "price_after_tax": 0,
                            "sort_order": 3,
                            "height": 0,
                            "width": 0,
                            "length": 0,
                            "radius": 0,
                            "mass": 0,
                            "to_currency_after_discount": 0,
                            "quantity_ordered": 2,
                            "discounted_price": 0,
                            "discounted_price_before_tax": 0,
                            "tax_percent": "8%",
                            "stock_name": "KHO24"
                        }
                    ],
                    "account_name": "KH10665",
                    "sale_order_name": "2602060HAQXEQK"
                }
                await SELF.updateCrmObjects({ select: 'SaleOrders', items: [crmOrder], token, clientId: SELF.AMIS_CLIENT_ID, crmUrl: SELF.AMIS_CRM_URL })
            } catch (error) {
                console.log(`[MisaApiService] - [testUpdateOrder] - fail: `, error.stack);
                return Promise.reject(error);
            }
        },
        /**
         * Xử lý đơn hàng mới theo data từ webhook
         * @param {Object} webhookData Data webhook
         */
        processNewOrderFromWebhook: async (webhookData) => {
            const clog = (msg, ...args) => console.log(`[MisaApiService.processNewOrderFromWebhook] ${msg}`, ...args);
            const orderData = webhookData.data;

            // Validate input
            if (!orderData || !orderData.omisell_order_number) {
                clog('Invalid orderData: missing omisell_order_number');
                return;
            }

            const omisell_order_number = orderData.omisell_order_number;
            const sentAt = new Date();
            let crmOrder;

            try {
                const [_, token, orderDb, misaEnums] = await Promise.all([
                    SELF.loadConfig(),
                    SELF.getToken(),
                    Order.findOne({ omisell_order_number: omisell_order_number }).lean(),
                    MisaEnum.find({ category: { $in: ['delivery_status', 'status'] } }).lean()
                ])

                // Không có sẵn đơn hàng thì get lại từ API
                if (!orderDb) {
                    await Order.updateOne(
                        { omisell_order_number: omisell_order_number },
                        { $set: orderData },
                        { upsert: true }
                    );

                    const orderDetailData = await OmisellApiService.getOrderDetail(omisell_order_number);
                    if (orderDetailData?.data) {
                        await OrderDetail.updateOne(
                            { omisell_order_number: omisell_order_number },
                            { $set: orderDetailData.data },
                            { upsert: true }
                        );
                    }

                }
                let orderDetailDb = await OrderDetail.findOne({ omisell_order_number: omisell_order_number }).lean();
                if (!orderDetailDb) {
                    clog(`Cannot get order detail for order: ${omisell_order_number}`);
                    clog(`Start crawl order detail for order: ${omisell_order_number}`)
                    const orderDetailData = await OmisellApiService.getOrderDetail(omisell_order_number);
                    if (!orderDetailData?.data) {
                        clog(`Cannot get order detail from Omisell for order: ${omisell_order_number}`);
                        return   
                    }
                    orderDetailDb = orderDetailData.data;
                    await OrderDetail.updateOne(
                        { omisell_order_number: omisell_order_number },
                        { $set: orderDetailData.data },
                        { upsert: true }
                    );
                }

                // Cập nhật trạng thái xử lý misa của đơn hàng
                await Order.updateOne(
                    { omisell_order_number: omisell_order_number },
                    { $set: { misa_status: StatusWebhook.PENDING, misa_sent_time: sentAt } }
                );

                crmOrder = SELF.mapOmisellToCrmSaleOrder(orderDetailDb, SELF.PICKUP_LIST);

                const statusType = webhookData.event.split('.')[0];

                // map trạng thái cho misa
                crmOrder.status = statusType === 'order' ? misaEnums.find(e => e.category === 'status' && Number(e.key) === orderData?.status_id)?.label : crmOrder.status
                crmOrder.delivery_status = statusType === 'shipment' ? misaEnums.find(e => e.category === 'delivery_status' && Number(e.key) === orderData?.status_id)?.label : crmOrder.delivery_status

                clog(`Pushing order: ${omisell_order_number}`);

                // Có misa_id trong db -> đã push -> update
                let misaId;
                if (orderDb?.misa_id) {
                    clog(`Order pushed to misa. Update order: ${omisell_order_number}`);
                    crmOrder.id = orderDb.misa_id;
                    misaId = orderDb.misa_id;
                    console.time(`[MisaApiService.processNewOrderFromWebhook] - updateCrmObjects ${omisell_order_number}`)
                    await SELF.updateCrmObjects({ select: 'SaleOrders', items: [crmOrder], token, clientId: SELF.AMIS_CLIENT_ID, crmUrl: SELF.AMIS_CRM_URL })
                    console.timeEnd(`[MisaApiService.processNewOrderFromWebhook] - updateCrmObjects ${omisell_order_number}`)
                } else {
                    console.time(`[MisaApiService.processNewOrderFromWebhook] - addCrmObjects ${omisell_order_number}`)
                    misaId = await SELF.addCrmObjects({
                        select: 'SaleOrders',
                        items: [crmOrder],
                        token,
                        clientId: SELF.AMIS_CLIENT_ID,
                        crmUrl: SELF.AMIS_CRM_URL
                    })
                    console.timeEnd(`[MisaApiService.processNewOrderFromWebhook] - addCrmObjects ${omisell_order_number}`)
                }
                clog(`Push SUCCESS | omisell_order_number=${omisell_order_number} | misaId=${misaId}`);

                await Order.updateOne(
                    { omisell_order_number },
                    { $set: { misa_status: StatusWebhook.SUCCESS, misa_response: { misa_id: misaId }, misa_sent_time: sentAt, misa_body: crmOrder || '', misa_id: misaId } }
                );
                return Promise.resolve();
            } catch (err) {
                clog(`Push FAIL | omisell_order_number=${omisell_order_number} | error=${JSON.stringify(err.stack)}`);
                await Order.updateOne(
                    { omisell_order_number },
                    {
                        $set: {
                            misa_status: StatusWebhook.FAILED,
                            misa_response: { error: err?.message || err?.stack || JSON.stringify(err) },
                            misa_sent_time: sentAt,
                            misa_body: crmOrder || ''
                        }
                    }
                ).catch(e => clog('Failed to update FAIL status:', e));
                return Promise.reject(err);
            }
        }
    }
}



module.exports = MisaApiService()
