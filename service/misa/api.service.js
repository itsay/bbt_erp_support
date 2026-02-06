const { Order, OrderDetail, PickupList } = require('../../model/omisell')
const fs = require('fs');


function MisaApiService() {
    const SELF = {
        LOCATION_MAPPING: JSON.parse(fs.readFileSync(`${__dirname}/../../location-misa.json`, 'utf-8')),
        AMIS_CRM_URL: process.env.AMIS_CRM_URL,
        AMIS_CLIENT_ID: process.env.AMIS_CLIENT_ID,
        AMIS_CLIENT_SECRET: process.env.AMIS_CLIENT_SECRET,
        accountTable: [
            { platform: 'Retail', shop_id: 29291, account_name: 'Khách hàng ECOM', account_number: 'KH10819', allowFeeShip: true },
            { platform: 'Shopee_v2', shop_id: 22931, account_name: 'Khách hàng Shopee', account_number: 'KH10665', allowFeeShip: false },
            { platform: 'Tiktok', shop_id: 22411, account_name: 'Khách hàng TikTok Shop', account_number: 'KH10799', allowFeeShip: true },
            { platform: 'Lazada', shop_id: 22853, account_name: 'Khách hàng Lazada', account_number: 'KH10798', allowFeeShip: true },
            { platform: 'Shopee_v2', shop_id: 33991, account_name: 'Khách hàng Shopee - Osaki', account_number: 'KH10663', allowFeeShip: false },
            { platform: 'Shopee_v2', shop_id: 33937, account_name: 'Khách hàng Shopee (Shop Vệ Tinh 1)', account_number: 'KH10876', allowFeeShip: false },
            { platform: 'Tiktok', shop_id: 34712, account_name: 'Khách hàng TikTok Shop - Osaki', account_number: 'KH11276', allowFeeShip: true },
            { platform: 'Shopee_v2', shop_id: 35431, account_name: 'Khách hàng Shopee (Shop Vệ Tinh 2)', account_number: 'KH11472', allowFeeShip: false },
        ],
        warehouses: [
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
        ],
        pay_status: {
            CHUA_THANH_TOAN: 'Chưa thanh toán',
            DA_THANH_TOAN: 'Đã thanh toán',
            DA_THANH_TOAN_MOI_PART: 'Đã thanh toán một phần',
        },
        status: {
            CHUA_THUC_HIEN: 'Chưa thực hiện',
            DANG_THUC_HIEN: 'Đang thực hiện',
            DA_THUC_HIEN: 'Đã thực hiện',
            DA_HUY_BO: 'Đã hủy bỏ',
            DA_GIAO: 'Đã giao đủ hàng',
        },
        sale_order_type: {
            normal: 'Đơn hàng Omisell',
            sample: 'Mẫu thử',
            BAN_MOI: 'Bán mới',
            NANG_CAP: 'Nâng cấp',
            GIA_HAN: 'Gia hạn/Cập nhật',
            DICH_VU_DAO_TAO: 'Dịch vụ đào tạo',
            DICH_VU_TU_VAN_TRIEN_KHAI: 'Dịch vụ tư vấn triển khai',
            DICH_VU_KHAC: 'Dịch vụ khác',
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
            const omisellNo = src.omisell_order_number;
            console.log('omisell_order_number:', omisellNo);
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
                status: src?.status_name || SELF.status.CHUA_THUC_HIEN,
                shipping_code: firstParcel.package_number || receiver.zip_code || '',
                shipping_amount_summary,
                delivery_status: firstParcel.shipment_status_name || String(firstParcel.shipment_status || ''),
                list_product,
                amount_summary,
                discount_summary,
                pay_status: paymentInfo[0].transaction_status_name || SELF.pay_status.CHUA_THANH_TOAN,
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
        }
    }
    return {
        test: async () => {
            const token = await SELF.getToken()
            const [docs, pickups] = await Promise.all([
                Order.find({ misa_status: { $ne: "SUCCESS" } }).sort({ created_time: 1 }).lean(),
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
        createOrder: async () => {
            try {
                await SELF.addCrmObjects({ select: 'SaleOrders', items, token, clientId, crmUrl })
            } catch (error) {
                console.log(`[MisaApiService] - [createOrder] - fail: `, error.stack);
                return Promise.reject(error);
            }
        },
        test2: async () => {
            const token = await SELF.getToken()
            const [docs, pickups] = await Promise.all([
                Order.find({ misa_status: { $ne: "SUCCESS" }, omisell_order_number: "OV260204CED75934" }).sort({ created_time: 1 }).lean(),
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
    }
}

module.exports = MisaApiService()
