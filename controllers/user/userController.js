const User=require("../../models/userSchema");
require("dotenv").config();
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const Product=require("../../models/productSchema");



const pageNotFound=async(req,res)=>{
    try{
        res.render("page-404")

    }catch(error){
        res.redirect("/pageNotFound")

    }
}


const loadHomepage=async(req,res) =>{
    try{

        return res.render("home");

    }catch(error){
        console.log("Home page not found");
        res.status(500).send("Server error")

    }
}


const loadSignUp = async (req, res) => {
    try {
        return res.render('signUp')
    } catch (error) {
        console.log("Register page not loading", error)
        res.status(500).send('Server error')
    }
}

function generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", otp); // Log the OTP here
    return otp;
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587, // Use 587 for STARTTLS or 465 for SSL/TLS
            secure: false, // Set true for port 465
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        });

        console.log("Email sent successfully to:", info.messageId);
        return info.accepted.length > 0; // Return true if email was accepted
    } catch (error) {
        console.error("Error sending email:", error.message);
        return false; // Return false if email sending failed
    }
}

const signup = async (req,res)=>{

    try {
        const {name ,email, password, phone } = req.body

    const existingUser = await User.findOne({email})
    if(existingUser){
        res.render('signUp',{error:"User already exist"})
    }else{
        const otp = generateOtp()
        const otpExpiration = Date.now() + 5 * 60 * 1000; // 5 minutes
        req.session.otpExpiration = otpExpiration;


        const emailSent = await sendVerificationEmail(email, otp)
        if (!emailSent) {
            return res.json('email-error')
        }

        req.session.loggedIn= true;
        req.session.userOtp = otp
        req.session.userData = { name, email, password, phone }
        
        console.log(req.session.userData);

        res.redirect('/verify')
        console.log("OTP Sent ", otp)
    }
    } catch (error) {
        console.error("Signup Error", error);
        res.status(500).send("Internal Server Error");
        
    }

}

const securePassword=async(password)=>{
    try {

        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash;
        
    } catch (error) {
        
    }
}


const loadOtpPage = (req, res) => {
    const message = req.session.errorMessage || null; 
    res.render('verify-otp', { message });
};


const verifyRegister = async (req,res)=>{

    try {
        const {name ,email, password, phone } = req.body

    const existingUser = await User.findOne({email})
    if(existingUser){
        res.render('signUp',{error:"User already exist"})
    }else{
        const otp = generateOtp()
        const otpExpiration = Date.now() + 5 * 60 * 1000; // 5 minutes
    req.session.otpExpiration = otpExpiration;


        const emailSent = await sendVerificationEmail(email, otp)
        if (!emailSent) {
            return res.json('email-error')
        }

        req.session.loggedIn= true;
        req.session.userOtp = otp
        req.session.userData = { name, email, password, phone }
        
        console.log(req.session.userData);

        res.redirect('/verify')
        console.log("OTP Sent ", otp)
    }
    } catch (error) {
        console.error("Signup Error", error);
        res.status(500).send("Internal Server Error");
        
    }

    
}

const verifyOtp = async (req, res) => {
    try {
        const otpArray = req.body.otp;
        const otp = Array.isArray(otpArray) ? otpArray.join('') : otpArray;

        if (!req.session.userData) {
            console.error('No user data found in session.');
            req.session.errorMessage = "Session expired or invalid. Please try again.";
            return res.status(400).json({ success: false, message: req.session.errorMessage });
        }

        const user = req.session.userData;

        if (Date.now() > req.session.otpExpiration) {
            console.error('OTP has expired');
            req.session.errorMessage = "OTP has expired. Please request a new one.";
            return res.status(400).json({ success: false, message: req.session.errorMessage });
        }

        if (otp === req.session.userOtp) {
            console.log('OTP matched:', otp);

            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
                otp: otp,
                otpExpiration: new Date(Date.now() + 5 * 60 * 1000),
            });

            await saveUserData.save();
            console.log('User Saved Successfully:', saveUserData);

            req.session.userOtp = null;
            req.session.otpExpiration = null;
            req.session.userData = null;
            req.session.user = saveUserData._id;

            req.session.errorMessage = "OTP verified successfully!";

            return res.json({ success: true, message: 'OTP Verified Successfully', redirectUrl: '/' });
        } else {
            console.error('Invalid OTP');
            req.session.errorMessage = "Invalid OTP. Please try again.";
            return res.status(400).json({ success: false, message: req.session.errorMessage });
        }
    } catch (error) {
        console.error('Error Verifying OTP:', error);
        req.session.errorMessage = "An unexpected error occurred. Please try again.";
        return res.status(500).json({ success: false, message: req.session.errorMessage });
    }
};


const resendOtp = async (req, res) => {
    try {
        if (!req.session.userData) {
            return res.status(400).json({ success: false, message: "No user data found in session." });
        }

        const user = req.session.userData;

        // Check if OTP was recently generated and if we need to wait before generating a new one
        const lastOtpGenerated = req.session.otpGeneratedAt;
        const now = Date.now();

        if (lastOtpGenerated && (now - lastOtpGenerated) < 60000) {  // Less than 1 minute
            return res.status(400).json({ success: true, message: "Please wait before requesting a new OTP." });
        }

        // Generate new OTP
        const newOtp = generateOtp();
        const otpExpiration = new Date(Date.now() + 5 * 60 * 1000);  // Set expiration time for 5 minutes

        // Save the new OTP and expiration time in session
        req.session.userOtp = newOtp;
        req.session.otpExpiration = otpExpiration;
        req.session.otpGeneratedAt = now;  // Save time of OTP generation

        // Send OTP (For now, just log it to the console)
        console.log(`Sending OTP to user: ${newOtp}`);

        res.json({
            success: true,
            message: 'OTP resent successfully!',
            otpExpiration: otpExpiration.toISOString(),
        });

    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({ success: false, message: "An error occurred while resending OTP. Please try again later." });
    }
};

const registerUser = async (req, res) => {
    try {
        const { name, email, password,phone } = req.body;

        // Input validation
        if (!name || !email || !password || !phone) {
            return res.status(400).send('All fields are required');
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email is already registered');
        }

    
        const otp = crypto.randomInt(100000, 999999).toString();

    
        const hashedPassword = await hashPassword(password);

    
        const newUser = new User({
            name,
            email,
            phone,
            password: hashedPassword,
            otp,
            otpExpiration: Date.now() + 5 * 60 * 1000 // OTP expires in 5 minutes
        });

        await newUser.save();

        
        await sendOTP(email, otp);

        
        res.redirect('/verify');
    } catch (err) {
        console.error('Error during registration:', err);
        res.status(500).send('Internal Server Error');
    }
};

const loadLogin=async(req,res)=>{
    try {
        
        if(!req.session.user){
            return res.render("login")
        }else{
            res.redirect("/")
        }

    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Log the incoming request data to debug
        console.log('Login data:', req.body);

        // Search for user by email and isAdmin condition
        const findUser = await User.findOne({ isAdmin: 0, email: email });

        // Check if user was found
        if (!findUser) {
            console.log('User not found with email:', email); // Add logging for debugging
            return res.render("login", { message: "User not found" });
        }

        // Check if user is blocked
        if (findUser.isBlocked) {
            console.log('User is blocked:', email);
            return res.render("login", { message: "User is blocked by admin" });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(password, findUser.password);
        console.log();
        
        if (!passwordMatch) {
            console.log('Incorrect password for user:', email);
            return res.render("login", { message: "Incorrect Password" });
        }

        // If everything is correct, set the session and redirect
        req.session.user = findUser._id;
        console.log('Session set for user:', req.session.user);
        res.redirect("/");

    } catch (error) {
        console.error("Login error:", error);
        res.render("login", { message: "Login failed. Please try again later" });
    }
};

const loadShopPage=async(req,res) =>{
    try{
        const product= await Product.find({})
        return res.render("shop",{product});

    }catch(error){
        console.log("shop page not found",error);
        res.status(500).send("Server error")

    }
}

const productDetails=async(req,res)=>{
    try {

        const productId = req.params.id
        const product=await Product.findOne({_id:productId})
        console.log("product in details ", product)
        res.render("productDetails",{product});
    } catch (error) {
        console.log("product is not display",error)
    }
}


module.exports={
    loadHomepage,
    pageNotFound,
    loadSignUp,
    sendVerificationEmail,
    signup,
    verifyRegister,
    loadOtpPage,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    registerUser,
    loadShopPage,
    productDetails,
}














