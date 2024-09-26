const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    firstName:{
        type: String,
        required: [true, 'Please enter youre name'],
        maxLength: [30, 'Your firstName cannot exceed 30 characters']
    },
    lastName:{
        type: String,
        required: [true, 'Please enter youre name'],
        maxLength: [30, 'Your lastName cannot exceed 30 characters']
    },
    email:{
        type: String,
        required: [true, 'Please enter youre email'],
        unique: true,
        validate: [validator.isEmail, 'Please enter valid email address']
    },
    password:{
        type: String,
        required: [true, 'Please enter youre password'],
        minlength: [6, 'Your password must be longer than 6 characters'],
        select: false
    },
    avatar: {
        public_id: {
            type: String,
            required: true
        },
        url: {
            type: String,
            required:true
        }

    },
    role: {
        type: String,
        required: true
        
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId, 
        
        ref: 'User'
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,

    resetPasswordToken: String, 
    resetPasswordExpire: Date

})

//Encrypting password before saving user 
userSchema.pre('save', async function(next) {
    if(!this.isModified('password')){
        next()
    }
    this.password = await bcrypt.hash(this.password, 10);
})

//Compare user password 
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password)
}

//Return JWT token
userSchema.methods.getJwtToken = function (){
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME
    })
}

//Generate password reset token
userSchema.methods.getResetPasswordToken = function () {
    //Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to resetPasswordToken
    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    //Set token expire time
    this.resetPasswordExpire = Date.now() + 30 * 60 * 1000

    return resetToken
}

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
    // Generate token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to emailVerificationToken
    this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    // Set token expire time (30 minuta)
    this.emailVerificationExpire = Date.now() + 30 * 60 * 1000;

    return verificationToken;
}

module.exports = mongoose.model('User', userSchema)