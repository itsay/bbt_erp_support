const OmisellApiService = require('../../service/omisell/api.service')
const MisaApiService = require('../../service/misa/api.service')
const { Order, OrderDetail, OrderRevenue, PickupList } = require('../../model/omisell')
const Util = require('../util/util')


function OmisellJobController() {
    const SELF = {
        fetchAndSaveOrders: async (updatedTime) => {
            const clog = (msg, ...args) => console.log(`[OmisellJobController.fetchAndSaveOrders] - ${msg}`, ...args);
            clog('Start fetching orders');
            const pageSize = 100
            let page = 1

            let processed = 0

            const omisell_order_numbers = []

            while (true) {
                const rs = await OmisellApiService.getOrders({
                    updated_from: updatedTime,
                    page_size: pageSize,
                    page
                });

                const { count, next, results } = rs?.data || {};
                const orders = results || [];

                if (page === 1) {
                    clog(`Total orders to fetch: ${count}`);
                }
                processed += results.length;

                const ops = orders.map(o => {
                    const key = o.omisell_order_number || o.order_number;
                    omisell_order_numbers.push(key);
                    clog(`Processing order ${key}`);
                    o.omisell_order_number = key;
                    if (!key) return null;
                    return {
                        updateOne: {
                            filter: { omisell_order_number: key },
                            update: { $set: Object.assign({}, o, { omisell_order_number: key, fetchedAt: new Date() }) },
                            upsert: true
                        }
                    };
                }).filter(Boolean);

                if (ops.length) {
                    await Order.bulkWrite(ops, { ordered: false });
                }

                clog(`Page ${page} processed. Orders count: ${processed}/${count}`);

                if (!next) {
                    break;
                }

                await Util.sleep(2);
                page++;
            }
            return omisell_order_numbers
        },
        fetchAndSaveOrderDetails: async (omisell_order_numbers) => {
            const clog = (msg, ...args) => console.log(`[OmisellJobController.fetchAndSaveOrderDetails] - ${msg}`, ...args);
            clog('Start fetching order details');
            let processed = 0;
            const total = omisell_order_numbers.length;
            clog(`Fetching order details for ${total} orders`);
            const chunk = (arr, size) => {
                const out = [];
                for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
                return out;
            };
            const batches = chunk(omisell_order_numbers, 10);
            for (let bi = 0; bi < batches.length; bi++) {
                const batch = batches[bi];
                for (const orderNo of batch) {
                    let detail = await OmisellApiService.getOrderDetail(orderNo);
                    if (detail?.data?.retry_after) {
                        clog('wait after', detail?.data?.retry_after);
                        await Util.sleep(Number(detail.data.retry_after) + 1);
                        detail = await OmisellApiService.getOrderDetail(orderNo);
                    }
                    await OrderDetail.updateOne(
                        { omisell_order_number: orderNo },
                        { $set: { omisell_order_number: orderNo, ...detail?.data, fetchedAt: new Date() } },
                        { upsert: true }
                    );
                    clog(`Total invetory item ${orderNo}: ${detail?.data.parcels?.[0].inventory_items?.length || 0}`);
                    processed++;
                    if (processed % 50 === 0) clog(`Order details processed: ${processed}/${total}`);
                }
                if (bi < batches.length - 1) {
                    await Util.sleep(2);
                }
            }
            clog(`Total order details saved: ${processed}/${total}`);
        },
        fetchAndSaveOrderRevenues: async (updatedFrom) => {
            const clog = (msg, ...args) => console.log(`[OmisellJobController.fetchAndSaveOrderRevenues] - ${msg}`, ...args);
            clog('Start fetching order revenues');
            const pageSize = 100;
            let page = 1;

            while (true) {
                const rs = await OmisellApiService.getOrderRevenue({
                    completed_from: updatedFrom,
                    page_size: pageSize,
                    page
                });

                const { count, next, results } = rs?.data || {};
                const revenues = results || [];

                if (page === 1) {
                    clog(`Total revenues to fetch: ${count}`);
                }

                const ops = revenues.map(o => {
                    const key = o.omisell_order_number || o.order_number;
                    if (!key) return null;
                    return {
                        updateOne: {
                            filter: { omisell_order_number: key },
                            update: { $set: { ...o, omisell_order_number: key, fetchedAt: new Date() } },
                            upsert: true
                        }
                    };
                }).filter(Boolean);

                if (ops.length) {
                    await OrderRevenue.bulkWrite(ops, { ordered: false });
                }

                clog(`Page ${page} processed. Revenue count: ${revenues.length}/${count}`);

                if (!next) {
                    break;
                }

                await Util.sleep(2);
                page++;
            }
        },
        fetchAndSavePickups: async () => {
            const clog = (msg, ...args) => console.log(`[OmisellJobController.fetchAndSavePickups] - ${msg}`, ...args);
            clog('Start fetching pickups');
            const pageSize = 25;
            let page = 1;

            while (true) {
                const rs = await OmisellApiService.getPickup({
                    page_size: pageSize,
                    page
                });

                const { count, next, results } = rs?.data || {};
                const pickups = results || [];

                if (page === 1) {
                    clog(`Total pickups to fetch: ${count}`);
                }

                const ops = pickups.map(p => {
                    const key = p.id;
                    if (!key) return null;
                    return {
                        updateOne: {
                            filter: { id: key },
                            update: { $set: { ...p, fetchedAt: new Date() } },
                            upsert: true
                        }
                    };
                }).filter(Boolean);

                if (ops.length) {
                    await PickupList.bulkWrite(ops, { ordered: false });
                }

                clog(`Page ${page} processed. Pickup count: ${pickups.length}/${count}`);

                if (!next) {
                    break;
                }

                await Util.sleep(2);
                page++;
            }
        },
    }
    return {
        /**
         * Lấy đơn hàng theo updatedTime và đẩy lên misa tự động
         * @param {number} _updatedTime - Unix timestamp of the last updated time
         * @param {number} intervalTime - Time interval in seconds (default: 1 day)
         */
        jobSaveOrders: async (intervalTime = 86400) => {
            let updatedTime = Math.floor(Date.now() / 1000) - intervalTime;
            if (updatedTime < 0) {
                updatedTime = 0;
            }
            console.log(`[OmisellJobController.jobSaveOrders] - Job started with updatedTime: ${updatedTime}`);
            const omisell_order_numbers = await SELF.fetchAndSaveOrders(updatedTime);
            await SELF.fetchAndSaveOrderDetails(omisell_order_numbers);
            await MisaApiService.processNewOrders(omisell_order_numbers);
            // await SELF.fetchAndSaveOrderRevenues(updatedTime);
        },
        jobSavePickups: async () => {
            await SELF.fetchAndSavePickups();
        },
        test: async () => {
            await SELF.fetchAndSaveOrders(1769878800);
        },
    }
}

module.exports = OmisellJobController();