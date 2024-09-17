const express = require('express')
const router = express.Router();

const { getProducts, newProduct, getSingleProduct, updateProduct, deleteProduct } = require('../controllers/productController')

const { isAuthenticatedUser } = require('../middlewares/auth')

router.route('/products').get(getProducts);
// router.route('/products').get(isAuthenticatedUser, getProducts);

router.route('/product/:id').get(getSingleProduct);

router.route('/product/new').post(isAuthenticatedUser, newProduct);

router.route('/product/update/:id').put(updateProduct);

router.route('/product/delete/:id').delete(deleteProduct);


module.exports = router;