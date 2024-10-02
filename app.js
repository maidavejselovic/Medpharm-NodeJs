const express  = require('express');
const cors = require('cors');
const app  = express();
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

//app.use(cors());
// CORS konfiguracija
app.use(cors({
    //origin: 'http://localhost:3000', // Adresa tvog frontenda
    origin: 'https://medpharm-react.onrender.com',
    credentials: true // Omogući slanje i primanje kolačića
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser());
app.use(fileUpload());


//Import all routes 
const products = require('./routes/productRoute');
const user = require('./routes/userRoute');
const order = require('./routes/orderRoute');

app.use('/api', products)
app.use('/api', user)
app.use('/api', order)

module.exports = app