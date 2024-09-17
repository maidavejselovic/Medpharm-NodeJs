const Product = require('../models/product')

const APIFeatures = require('../utils/apiFeatures')

//Create new product
exports.newProduct = async (req, res, next) => {

    req.body.user = req.user.id;
    
    const product = await Product.create(req.body);

    res.status(201).json({
        success: true,
        product 
    })
}

// Get all products
exports.getProducts = async (req, res, next) => {
    try {
        const resPerPage = 1;
        const productCount = await Product.countDocuments();

        // Kreiraj novi query objekat za pretragu i filtriranje
        let apiFeatures = new APIFeatures(Product.find(), req.query)
            .search()
            .filter();

        let products = await apiFeatures.query;
        let filteredProductsCount = products.length;

        // Kreiraj novi query objekat za paginaciju
        apiFeatures = new APIFeatures(Product.find(), req.query)
            .search()
            .filter()
            .pagination(resPerPage);

        products = await apiFeatures.query;

        res.status(200).json({
            success: true,
            count: products.length,
            productCount,
            resPerPage,
            filteredProductsCount,
            products
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


//Get Single Product
exports.getSingleProduct = async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if(!product) {
        return res.status(404).json({
            success: false, 
            message: 'Producct not found'
        })
    }

    res.status(200).json({
        success: true,
        product
    })
}


//Upadate Product
exports.updateProduct = async (req, res, next) => {

    let product = Product.findById(req.params.id);

    if(!product) {
        return res.status(404).json({
            success: false, 
            message: 'Producct not found'
        })
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    res.status(200).json({
        success: true,
        product
    })
}

//Delete Product 
exports.deleteProduct = async (req, res, next) => {

    const product = await Product.findById(req.params.id);

    if(!product) {
        return res.status(404).json({
            success: false, 
            message: 'Producct not found'
        })
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true, 
        message: 'Product is deleted'
    })
}