const User = require('../models/user')
const sendToken = require('../utils/jwtToken')
const sendEmail = require('../utils/sendEmail')
const cloudinary = require('cloudinary')

const crypto = require('crypto');

// Register user
exports.registerUser = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, avatar, role } = req.body;

        // Upload avatar na Cloudinary
        const result = await cloudinary.v2.uploader.upload(avatar, {
            folder: 'avatars',
            width: 150,
            crop: 'scale'
        });

        // Kreiraj korisnika
        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            avatar: {
                public_id: result.public_id,
                url: result.secure_url
            },
            role 
        });

        // Generiši verifikacioni token
        const verificationToken = user.getEmailVerificationToken();
        await user.save({ validateBeforeSave: false });

        // Kreiraj URL za verifikaciju email-a
        const verificationUrl = `${req.protocol}://${req.get('host')}/api/verifyemail/${verificationToken}`;

        const message = `Dobrodošli ${user.firstName}, \n\nMolimo vas da potvrdite vašu email adresu klikom na sledeći link: \n\n${verificationUrl}\n\nAko niste vi kreirali ovaj nalog, ignorišite ovu poruku.`;

        try {
            // Pošalji verifikacioni email
            await sendEmail({
                email: user.email,
                subject: 'Verifikacija email-a - Medpharm',
                message
            });

            res.status(200).json({
                success: true,
                message: `Verifikacioni email je poslat na: ${user.email}`
            });

        } catch (error) {
            user.emailVerificationToken = undefined;
            user.emailVerificationExpire = undefined;

            await user.save({ validateBeforeSave: false });

            return next(error.message);
        }

    } catch (error) {
        console.error('Greška prilikom registracije korisnika:', error);
        res.status(500).json({ message: 'Greška prilikom registracije korisnika.', error: error.message });
    }
};

// GET /api/verifyemail/:token
exports.verifyEmail = async (req, res, next) => {
    // Dobavi hashed token
    const verificationToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    // Nađi korisnika sa ovim tokenom
    const user = await User.findOne({
        emailVerificationToken: verificationToken,
        emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).send(`
            <h1>Neispravan ili istekao verifikacioni token.</h1>
            <p>Pokušajte ponovo ili se registrujte.</p>
        `);
    }

    // Verifikuj email
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    // HTML poruka o uspehu
res.status(200).send(`
<html>
    <head>
        <style>
            body {
                font-family: 'Verdana', sans-serif;
                background-color: white; 
                color: #37474f; /* Tamno siva boja */
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }
            .container {
                background: #ffffff;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
                text-align: center;
                max-width: 450px;
                border: 2px solid #00796b;
            }
            h1 {
                color: #00796b; 
                margin-bottom: 15px;
                font-size: 28px;
            }
            p {
                font-size: 18px;
                line-height: 1.6;
                margin-bottom: 25px;
            }
            a {
                color: #ffffff; /* Bele boje za tekst linka */
                background-color: #00796b; 
                text-decoration: none;
                padding: 12px 20px;
                border-radius: 8px;
                transition: background-color 0.3s, transform 0.3s;
                display: inline-block;
                font-weight: bold; /* Podebljani tekst */
            }
            a:hover {
                background-color: #004d40; 
                transform: scale(1.05); 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Email uspešno verifikovan!</h1>
            <p>Hvala što ste potvrdili svoj email.</p>
            <p><a href="http://localhost:3000/login">Kliknite ovde da se prijavite.</a></p>
        </div>
    </body>
</html>
`);
};

// Login user
exports.loginUser = async (req, res, next) => {
    const { email, password } = req.body;

    // Check if email and password are entered by user
    if (!email || !password) {
        return res.status(400).json({ message: 'Molimo unesite vašu email adresu i lozinku' });
    }

    // Finding user in database
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return res.status(400).json({ message: 'Email ili lozinka nisu ispravni' });
    }

    // Check if email is verified
    if (!user.isVerified) {
        return res.status(400).json({ message: 'Molimo vas da potvrdite vašu email adresu pre nego što se prijavite.' });
    }

    // Check if password is correct
    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
        return res.status(400).json({ message: 'Lozinka nije ispravna' });
    }

    // Send token if everything is OK
    sendToken(user, 200, res);
};

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

    const message = `Your password reset token is as follow: \n\n${resetUrl}\n\nIf you have not requested this email, then ignore it.`

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
            firstName: req.body.firstName,
            lastName: req.body.lastName,
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
        firstName: req.body.firstName,
        lastName: req.body.lastName,
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
