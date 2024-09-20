const express = require('express')
const router = express.Router()

const { authenticateToken, isAuthenticatedUser } = require('../middlewares/auth'); // Uvezi middleware
const { newOrder, getSingleOrder, myOrders, allOrders, updateOrder, deleteOrder } = require('../controllers/orderController')

router.route('/order/new').post(newOrder);
router.route('/order/:id').get(getSingleOrder);
router.route('/orders/me/:id').get(myOrders);

router.route('/admin/orders').get(allOrders);
router.route('/admin/order/:id').put(updateOrder);
router.route('/admin/order/:id').delete(deleteOrder);

module.exports = router