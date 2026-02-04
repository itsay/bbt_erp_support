const OmisellApiService = require('../service/omisell/api.service');
const MisaApiService = require('../service/misa/api.service');

function OrderController() {
    const SELF = {}
    return {
        createSaleOrder: async (req, res) => {
            try {
                const { order_id } = req.body;
                const order = await OmisellApiService.getOrderById(order_id);
                const saleOrder = MisaApiService.mapOmisellToCrmSaleOrder(order);
                res.json({ success: true });
            } catch (error) {
                console.log(`[OrderController] - [createSaleOrder] - fail: `, error.stack);
                res.json({ success: false, error: error.message });
            }
        }
    }
}

module.exports = OrderController();