const Order = require('../models/order');
const Product = require('../models/product');

exports.newOrder = async(req, res, next) => {
    const {
        orderItems,
        shippingInfo,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paymentInfo,
        user
    } = req.body;

    const order = await Order.create({
        orderItems,
        shippingInfo,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        paymentInfo,
        paidAt: Date.now(),
        user
    })

    res.status(200).json({
        success: true,
        order
    })
}

//Get single order
exports.getSingleOrder = async(req, res, next) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if(!order){
        return next('No order found with this id');
    }

    res.status(200).json({
        success:true, 
        order
    })
}

//Get loggedin users orders => /api/order/me
exports.myOrders = async(req, res, next) => {
    const orders = await Order.find({ user: req.user.id });

    res.status(200).json({
        success:true, 
        orders
    })
}

//Get all orders => /api/order/me
exports.allOrders = async(req, res, next) => {
    const orders = await Order.find();

    let totalAmount = 0;

    orders.forEach(order => {
        totalAmount += order.totalPrice
    });

    res.status(200).json({
        success:true, 
        totalAmount,
        orders
    })
}


//Update / Process order => /api/admin/order/:id
exports.updateOrder = async(req, res, next) => {
    const order = await Order.findById(req.params.id);

    if(order.orderStatus === 'Delivered'){
        return next('You have already delivered this order');
    }

    order.orderItems.forEach(async item => {
        await updateStock(item.product, item.quantity)
    })

    order.orderStatus = req.body.status;
    order.delivetredAt = Date.now();

    await order.save();

    res.status(200).json({
        success:true
    })
}

async function updateStock(id, quantity){
    const product = await Product.findById(id);

    product.stock = product.stock - quantity;

    await product.save({ validateBeforeSave: false });
}



//Delete single order
exports.deleteOrder = async(req, res, next) => {
    const order = await Order.findById(req.params.id);

    if(!order){
        return next('No order found with this id');
    }

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success:true
    })
}