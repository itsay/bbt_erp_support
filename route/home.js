"use strict";
const express = require("express");
const router = express.Router({});
const LoginController = require('./user/loginController')
const UserController = require("./user/userController");
const TrackingController = require("./tracking/trackingController");
const fileUpload = require("express-fileupload");
router.use(fileUpload());
router.use(TrackingController.trackAccessUrl);

/**API USER */
router.post('/user/login', LoginController.doLogin)
router.use(LoginController.verifyLogin)
router.get('/user/logout', LoginController.doLogout)
router.get("/user/role", LoginController.getRole);

/**API PRODUCT */

module.exports = router;
