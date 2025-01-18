const express=require("express")
const path=require("path");
const dotenv=require("dotenv").config();
// dotenv.config();
const session=require("express-session");
const passport=require("./config/passport");
const db=require("./config/db");
const userRouter=require("./routes/userRouter");
const adminRouter=require('./routes/adminRouter');

db();

const app=express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))


app.use(passport.initialize());
app.use(passport.session());




app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})


app.set("view engine","ejs")
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
app.use(express.static(path.join(__dirname,"public")));
// app.set('views', path.join(__dirname, 'views'));


app.use("/",userRouter)
app.use('/admin',adminRouter);

const PORT=3005 || process.env.PORT;
app.listen(PORT, ()=>{
    console.log("server Running");
    
})

module.exports=app;