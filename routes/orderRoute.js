const express = require('express')
const router = express.Router()

const { authenticateToken, isAuthenticatedUser } = require('../middlewares/auth'); // Uvezi middleware
const { newOrder, getSingleOrder, myOrders, allOrders, updateOrder, deleteOrder } = require('../controllers/orderController')

router.route('/order/new').post( newOrder);
router.route('/order/:id').get(isAuthenticatedUser, getSingleOrder);
router.route('/orders/me').get(isAuthenticatedUser, myOrders);

router.route('/admin/orders').get(isAuthenticatedUser, allOrders);
router.route('/admin/order/:id').put(isAuthenticatedUser, updateOrder);
router.route('/admin/order/:id').delete(isAuthenticatedUser, deleteOrder);

module.exports = router