require("dotenv").config();
const OmmiSellService = require("../../service/omisell.service");


async function test() {
    const orders = await OmmiSellService.getOrders();
    const order = orders[0]
    console.log(JSON.stringify(order, null, 2))
    const orderDetail = await OmmiSellService.getOrderDetail(order.omisell_order_number);
    console.log(JSON.stringify(orderDetail, null, 2));
}


test()