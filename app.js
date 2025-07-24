const express=require("express")
const path=require("path");
const dotenv=require("dotenv").config();
// dotenv.config();
const session=require("express-session");
const passport=require("./config/passport");
const db=require("./config/db");
const userRouter=require("./routes/userRouter");
const adminRouter=require('./routes/adminRouter');
const nocache=require("nocache");
const favicon=require('serve-favicon');

db();


const app=express();
app.use(nocache())

app.use(session({
    secret:process.env.SESSION_SECRET || "your-secret-key",
    resave:false,
    saveUninitialized:false,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000,
    },
}))

app.use((req, res, next) => {
  res.locals.user = req.session.user || null; 
  next();
});

app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({limit: '10mb' ,extended:true}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static("public"));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})


app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
app.use(express.static(path.join(__dirname,"public")));


app.use("/",userRouter)
app.use('/admin',adminRouter);

const PORT=3005 || process.env.PORT;
app.listen(PORT, ()=>{
    console.log("server Running");
    
})

module.exports=app;