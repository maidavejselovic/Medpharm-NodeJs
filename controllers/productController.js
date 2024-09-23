const Product = require('../models/product')
const APIFeatures = require('../utils/apiFeatures')
const cloudinary = require('cloudinary')

// Create new product   =>   /api/v1/admin/product/new
exports.newProduct = async (req, res, next) => {
    try {
        const result = await cloudinary.v2.uploader.upload(req.body.image, {
            folder: 'products',
            width: 150,
            crop: 'scale'
        });

        const { name, price, description, ratings, stock, category, user } = req.body;

        const product = await Product.create({
            name,
            price,
            description,
            ratings,
            category,
            stock,
            user,
            image: {
                public_id: result.public_id,
                url: result.secure_url
            }
        });

        res.status(201).json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Greška pri dodavanju proizvoda:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all products
exports.getProducts = async (req, res, next) => {
    try {
        const resPerPage = 6;
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
            message: 'Product not found'
        })
    }

    res.status(200).json({
        success: true,
        product
    })
}



//Update product 
exports.updateProduct = async (req, res, next) => {
    try {
        // Prvo pronalazimo proizvod po ID-u
        let product = await Product.findById(req.params.id);

        if (!product) {
            return next(new ErrorHandler('Product not found', 404));
        }

        const newProductData = {
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            category: req.body.category,
            stock: req.body.stock,
            seller: req.body.seller
        };

        // Provera da li postoji nova slika za proizvod
        if (req.body.image !== '') {
            // Ako proizvod već ima sliku, brišemo staru
            if (product.images && product.images.length > 0) {
                const image_id = product.images[0].public_id;
                await cloudinary.v2.uploader.destroy(image_id);
            }

            // Dodavanje nove slike
            const result = await cloudinary.v2.uploader.upload(req.body.image, {
                folder: 'products',
                width: 500,
                crop: "scale"
            });

            newProductData.images = [{
                public_id: result.public_id,
                url: result.secure_url
            }];
        }

        // Ažuriranje podataka proizvoda u bazi
        product = await Product.findByIdAndUpdate(req.params.id, newProductData, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        });

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        console.error("Error occurred in updateProduct:", error);
        return next(error);
    }
};

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