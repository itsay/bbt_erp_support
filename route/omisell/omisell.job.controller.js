const OmisellApiService = require('../../service/omisell/api.service')
const { Order, OrderDetail, OrderRevenue, PickupList } = require('../../model/omisell')
const Util = require('../util/util')


function OmisellJobController() {
    const SELF = {
        fetchAndSaveOrders: async (updatedTime) => {
            const pageSize = 100
            let page = 1

            let processed = 0

            while (true) {
                const rs = await OmisellApiService.getOrders({
                    updated_from: updatedTime,
                    page_size: pageSize,
                    page
                });

                const { count, next, results } = rs?.data || {};
                const orders = results || [];

                if (page === 1) {
                    console.log(`Total orders to fetch: ${count}`);
                }
                processed += results.length;

                const ops = orders.map(o => {
                    const key = o.omisell_order_number || o.order_number;
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

                console.log(`Page ${page} processed. Orders count: ${processed}/${count}`);

                if (!next) {
                    break;
                }

                await Util.sleep(2);
                page++;
            }
        },
        fetchAndSaveOrderDetails: async (updatedTime) => {
            const orders = await Order.find({ updated_time: { $gte: updatedTime } }, { omisell_order_number: 1 }).lean();
            const orderNos = orders.map(o => o.omisell_order_number);
            let processed = 0;
            let total = orderNos.length;
            console.log(`Fetching order details for ${total} orders`);
            const chunk = (arr, size) => {
                const out = [];
                for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
                return out;
            };
            const batches = chunk(orderNos, 10);
            for (let bi = 0; bi < batches.length; bi++) {
                const batch = batches[bi];
                for (const orderNo of batch) {
                    let detail = await OmisellApiService.getOrderDetail(orderNo);
                    if (detail?.data?.retry_after) {
                        console.log('wait after', detail?.data?.retry_after);
                        await Util.sleep(Number(detail.data.retry_after) + 1);
                        detail = await OmisellApiService.getOrderDetail(orderNo);
                    }
                    await OrderDetail.updateOne(
                        { omisell_order_number: orderNo },
                        { $set: { omisell_order_number: orderNo, ...detail?.data, fetchedAt: new Date() } },
                        { upsert: true }
                    );
                    processed++;
                    if (processed % 50 === 0) console.log(`Order details processed: ${processed}/${total}`);
                }
                if (bi < batches.length - 1) {
                    await Util.sleep(2);
                }
            }
            console.log(`Total order details saved: ${processed}/${total}`);
        },
        fetchAndSaveOrderRevenues: async (updatedFrom) => {
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
                    console.log(`Total revenues to fetch: ${count}`);
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

                console.log(`Page ${page} processed. Revenue count: ${revenues.length}/${count}`);

                if (!next) {
                    break;
                }

                await Util.sleep(2);
                page++;
            }
        },
        fetchAndSavePickups: async () => {
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
                    console.log(`Total pickups to fetch: ${count}`);
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

                console.log(`Page ${page} processed. Pickup count: ${pickups.length}/${count}`);

                if (!next) {
                    break;
                }

                await Util.sleep(2);
                page++;
            }
        },
    }
    return {
        jobSaveOrders: async (_updatedTime) => {
            let updatedTime = _updatedTime;
            if (!updatedTime) {
                const newestOrder = await Order.findOne({}).sort({ updated_time: -1 }).lean();
                updatedTime = newestOrder?.updated_time;
            }
            await SELF.fetchAndSaveOrders(updatedTime);
            await SELF.fetchAndSaveOrderDetails(updatedTime);
            await SELF.fetchAndSaveOrderRevenues(updatedTime);
        },
        jobSavePickups: async () => {
            await SELF.fetchAndSavePickups();
        },
        test: async () => {
            await SELF.fetchAndSaveOrderDetails(1770199200);
        }
    }
}

module.exports = OmisellJobController();