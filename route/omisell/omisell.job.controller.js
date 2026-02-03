const OmiSellService = require('../../service/omisell.service')
const { Order, OrderDetail, OrderRevenue } = require('../../model/omisell')
const Util = require('../util/util')


function OmisellJobController() {
    const SELF = {
        /**
         * 
         */
        fetchAndSaveOrders: async () => {
            const pageSize = 100
            let page = 1
            const omisellOrderNos = []
            const newestOrder = await Order.findOne({}).sort({ updated_time: -1 });
            const updatedTime = newestOrder?.updated_time ?? ;
            let hasMorePages = true;

            while (hasMorePages) {
                const rs = await OmiSellService.getOrders({
                    updated_from: updatedTime,
                    page_size: pageSize,
                    page
                });

                const ops = rs.map(o => {
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

                rs.forEach(order => {
                    if (order.omisell_order_number) {
                        omisellOrderNos.push(order.omisell_order_number);
                    }
                });

                console.log(`Page ${page} processed. Orders count: ${rs.length}`);

                if (rs.length < pageSize) {
                    hasMorePages = false;
                } else {
                    await Util.sleep(2);
                }
                page++;
            }
            console.log(`Total orders saved: ${omisellOrderNos.length}`);
            return { updatedTime, omisellOrderNos };
        },
        fetchAndSaveOrderDetails: async (orderNos = []) => {
            let processed = 0;
            const total = orderNos.length;
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
                    let detail = await OmiSellService.getOrderDetail(orderNo);
                    if (detail?.data?.retry_after) {
                        console.log('wait after', detail?.data?.retry_after);
                        await Util.sleep(Number(detail.data.retry_after) + 1);
                        detail = await OmiSellService.getOrderDetail(orderNo);
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
        /**
         * 
         * @param {number} updatedFrom 
         */
        fetchAndSaveOrderRevenues: async (updatedFrom) => {
            const pageSize = 100;
            let page = 1;
            let hasMorePages = true;

            while (hasMorePages) {
                const rs = await OmiSellService.getOrderRevenue({
                    completed_from: updatedFrom,
                    page_size: pageSize,
                    page
                });

                const ops = rs.map(o => {
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

                console.log(`Page ${page} processed. Revenue count: ${rs.length}`);

                if (rs.length < pageSize) hasMorePages = false;
                else {
                    await Util.sleep(2);
                }
                page++;
            }
        }
    }
    return {
        jobSaveOrders: async () => {
            const { updatedTime, omisellOrderNos } = await SELF.fetchAndSaveOrders();
            await SELF.fetchAndSaveOrderDetails(omisellOrderNos);
            // await SELF.fetchAndSaveOrderRevenues(updatedTime);
        },
    }
}

module.exports = OmisellJobController();