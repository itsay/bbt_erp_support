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
router.get('/users', UserController.getUsers)
router.post('/user', UserController.add)
router.put('/user/:id', UserController.edit)
router.delete('/user/:id', UserController.delete)

module.exports = router;
