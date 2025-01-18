const express=require('express');
const router=express.Router();
const adminController=require("../controllers/admin/adminController");
const adminUserController=require("../controllers/admin/adminUserController");
const categoryController=require("../controllers/admin/categoryController");
const  { userAuth,adminAuth}=require("../middlewares/auth");
const productController=require("../controllers/admin/productController");
const upload = require('../middlewares/multer');

router.get("/pageerror",adminController.pageerror);
router.get('/admin-login',adminController.loadLogin);
router.post("/admin-login",adminController.login);
router.get("/Dashboard",adminController.loadDashboard);
router.get('/logout',adminController.logout);

router.get("/User",adminAuth,adminUserController.userInfo);
router.get("/blockUser",adminAuth,adminUserController.UserBlocked);
router.get("/unblockUser",adminAuth,adminUserController.UserunBlocked);

router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/add-category",adminAuth,categoryController.addCategory);
router.put("/update-category/:id",adminAuth,categoryController.updateCategory);
router.delete("/delete-category/:id",adminAuth,categoryController.deleteCategory);
router.put("/list-category/:id",adminAuth,categoryController.listCategory);
router.put("/unlist-category/:id",adminAuth,categoryController.unlistCategory);



router.get("/product",adminAuth,productController.loadProduct);
router.get("/addproduct",adminAuth,productController.getProductAddPage);
router.post("/addproduct",upload.array("productImages",4),productController.addproduct);


module.exports=router;