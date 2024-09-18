const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Proverava da li je korisnik autentifikovan (iz kolačića)
exports.isAuthenticatedUser = async (req, res, next) => {
    const { token } = req.cookies;

    if (!token) {
        return res.status(401).json({ message: 'Morate biti ulogovani da biste pristupili ovoj funkciji.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Nevažeći token, prijavite se ponovo.' });
    }
};

