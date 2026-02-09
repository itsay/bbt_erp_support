"use strict";
const express = require("express");
const router = express.Router({});
const LoginController = require('./user/loginController')
const UserController = require("./user/userController");
const MisaConfigController = require("./misa/misaConfigController");
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

/**MISA CONFIG */
router.get('/misa-config/accounts', MisaConfigController.getAccounts)
router.post('/misa-config/account', MisaConfigController.addAccount)
router.put('/misa-config/account/:id', MisaConfigController.editAccount)
router.delete('/misa-config/account/:id', MisaConfigController.deleteAccount)

router.get('/misa-config/warehouses', MisaConfigController.getWarehouses)
router.post('/misa-config/warehouse', MisaConfigController.addWarehouse)
router.put('/misa-config/warehouse/:id', MisaConfigController.editWarehouse)
router.delete('/misa-config/warehouse/:id', MisaConfigController.deleteWarehouse)

router.get('/misa-config/enums', MisaConfigController.getEnums)
router.post('/misa-config/enum', MisaConfigController.addEnum)
router.put('/misa-config/enum/:id', MisaConfigController.editEnum)
router.delete('/misa-config/enum/:id', MisaConfigController.deleteEnum)

module.exports = router;
