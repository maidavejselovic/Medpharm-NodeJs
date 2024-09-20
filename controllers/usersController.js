const User = require('../models/user')
const sendToken = require('../utils/jwtToken')
const sendEmail = require('../utils/sendEmail')
const cloudinary = require('cloudinary')

const crypto = require('crypto')

// Register user
exports.registerUser = async (req, res, next) => {
    try {
        const { name, email, password, avatar} = req.body;

        // Upload avatar na Cloudinary
        const result = await cloudinary.v2.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150,
            crop: 'scale'
        });

        // Kreiraj korisnika
        const user = await User.create({
            name,
            email,
            password,
            avatar: {
                public_id: result.public_id,
                url: result.secure_url
            },
            
        });

        // Pošalji token
        sendToken(user, 200, res);
    } catch (error) {
        console.error('Greška prilikom registracije korisnika:', error);
        res.status(500).json({ message: 'Greška prilikom registracije korisnika.', error: error.message });
    }
};


//Login user
exports.loginUser = async(req, res, next) =>{
    const {email, password} = req.body;

    //check if email and password is entered by user
    if(!email || !password){
        return next('Please enter your email and password')
    }

    //finding user in database
    const user = await User.findOne({email}).select('+password')

    if(!user){
        return next('Email or password is not valid');

    }
    //check if password is correct or not
    const isPasswordMatched = await user.comparePassword(password);
    
    if(!isPasswordMatched){
        return next('The code does not match')

    }
    
    sendToken(user, 200, res)

}


//Forgot password => /api/passwprd/forgot
exports.forgotPassword = async (req, res, next) => {

    const user = await User.findOne({ email: req.body.email });

    if(!user){
        return next('User not found with this email');
    }

    //Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false })

    // Create reset passwprd url
    const resetUrl = `${req.protocol}://${req.get('host')}/api/password/reset/${resetToken}`;

    const message = `Your password reset token is as follow: \n\n${resetUrl}\n\nIf pou have not requested this email, then ignore it.`

    try {
        
        await sendEmail({
            email: user.email,
            subject: 'Medpharm Password Recovery',
            message
        })

        res.status(200).json({
            success:true,
            message:`Email send to: ${user.email}`
        })

    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave: false })

        return next(error.message)
    }
}



//Reset password => /api/passwprd/reset/:token
exports.resetPassword = async (req, res, next) => {

    //Hash URL token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex')

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    })

    if(!user){
        return next('Password reset token is ivalid or has been expired')
    }

    if(req.body.password !== req.body.confirmPassword){
        return next('Password does not match')
    }

    //Setup new password
    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user, 200, res);
}


//Get currently logged in user details
exports.getUserProfile = async (req, res, next) => {
    const user = await User.findById(req.params.id);

    res.status(200).json({
        success: true,
        user
    })
}

//Update password => /api/password/update
exports.updatePassword = async (req, res, next) => {
    const user = await User.findById(req.body.id).select('+password');

    console.log("useeer", user)
    // Check previus user password 
    const isMatched = await user.comparePassword(req.body.oldPassword);
    if(!isMatched){
        return next('Old password is incorect.')
    }
    user.password = req.body.password;
    await user.save();

    sendToken(user, 200, res);
}

// User profile update => /api/me/update
exports.updateProfile = async (req, res, next) => {
    try {
        console.log("Request body:", JSON.stringify(req.body, null, 2));
        console.log("Updating user profile for user ID:", req.body.user);

        const newUserData = {
            name: req.body.name,
            email: req.body.email,
            user: req.body.user
        };

        // Update avatar if a new one is provided
        if (req.body.avatar !== '') {
            const user = await User.findById(req.body.user);
            const image_id = user.avatar.public_id;
            await cloudinary.v2.uploader.destroy(image_id);

            const result = await cloudinary.v2.uploader.upload(req.body.avatar, {
                folder: 'avatars',
                width: 150,
                crop: "scale"
            });

            newUserData.avatar = {
                public_id: result.public_id,
                url: result.secure_url
            };
        }

        // Update user profile in the database
        const user = await User.findByIdAndUpdate(req.body.user, newUserData, {
            new: true,
            runValidators: true,
            useFindAndModify: false
        });
        res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error("Error occurred in updateProfile:", error);
        return next(error);
    }
}

//Logout user  => /api/logout 
exports.logout = async(req, res, next) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true
    })

    res.status(200).json({
        success: true, 
        message: 'Logged out'
    })
}

//Admin Routes

//Get All Users => /api/users
exports.allUsers = async(req, res, next) => {
    const users = await User.find();

    res.status(200).json({
        success: true,
        users
    })
}

//Get User Details
exports.getUserDetails = async(req, res, next) => {
    const user = await User.findById(req.params.id);

    if(!user){
        return next(`User does not found with id: ${req.param.id}`);
    }

    res.status(200).json({
        success: true,
        user
    })
}

// User profile update => /api/admin/user/:id
exports.updateUser = async(req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
    };

    // Find the user by ID
    let user = await User.findById(req.params.id);

    // If user not found, return error
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Update the user details
    user = await User.findByIdAndUpdate(req.params.id, newUserData, {
        new: true, // Return the updated document
        runValidators: true, // Run Mongoose schema validations
        useFindAndModify: false // Disable deprecated use of findAndModify
    });

    res.status(200).json({
        success: true,
        user // Return updated user data
    });
}

//Delete User=> /api/delete 
exports.deleteUser = async (req, res, next) => {

    const user = await User.findById(req.params.id);

    if(!user) {
        return res.status(404).json({
            success: false, 
            message: 'User does not found'
        })
    }

    //Remove avatar 

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true, 
        message: 'User is deleted'
    })
}
