"use strict";
const Logger = require("./../util/logController").Logger;
const { MisaAccount, MisaWarehouse, MisaEnum } = require("../../model/misa-config");
const MisaApiService = require("../../service/misa/api.service");

function MisaConfigController() {
    return {
        // ===== MisaAccount =====
        getAccounts: async (req, res) => {
            try {
                const docs = await MisaAccount.find({}).sort({ platform: 1, shop_id: 1 }).lean();
                res.json({ s: 200, data: docs });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: "Internal Server Error" });
            }
        },
        addAccount: async (req, res) => {
            try {
                const doc = await MisaAccount.create(req.body);
                res.json({ s: 200, data: doc });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: error.code === 11000 ? "Platform + Shop ID đã tồn tại" : "Internal Server Error" });
            }
        },
        editAccount: async (req, res) => {
            try {
                const doc = await MisaAccount.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
                res.json({ s: 200, data: doc });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: "Internal Server Error" });
            }
        },
        deleteAccount: async (req, res) => {
            try {
                await MisaAccount.findOneAndDelete({ _id: req.params.id });
                res.json({ s: 200 });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: "Internal Server Error" });
            }
        },

        // ===== MisaWarehouse =====
        getWarehouses: async (req, res) => {
            try {
                const docs = await MisaWarehouse.find({}).sort({ warehouse_code: 1 }).lean();
                res.json({ s: 200, data: docs });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: "Internal Server Error" });
            }
        },
        addWarehouse: async (req, res) => {
            try {
                const { warehouse_code, warehouse_name } = req.body;
                const [doc, misaResult] = await Promise.all([
                    MisaWarehouse.create(req.body),
                    MisaApiService.addWarehouse({ warehouse_code, warehouse_name })
                ]);
                res.json({ s: 200, data: doc, misa: misaResult });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: error.code === 11000 ? "Mã kho đã tồn tại" : "Internal Server Error" });
            }
        },
        editWarehouse: async (req, res) => {
            try {
                const doc = await MisaWarehouse.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
                res.json({ s: 200, data: doc });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: "Internal Server Error" });
            }
        },
        deleteWarehouse: async (req, res) => {
            try {
                await MisaWarehouse.findOneAndDelete({ _id: req.params.id });
                res.json({ s: 200 });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: "Internal Server Error" });
            }
        },

        // ===== MisaEnum (pay_status, status, sale_order_type) =====
        getEnums: async (req, res) => {
            try {
                const { category } = req.query;
                const filter = category ? { category } : {};
                const docs = await MisaEnum.find(filter).sort({ category: 1, key: 1 }).lean();
                res.json({ s: 200, data: docs });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: "Internal Server Error" });
            }
        },
        addEnum: async (req, res) => {
            try {
                const doc = await MisaEnum.create(req.body);
                res.json({ s: 200, data: doc });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: error.code === 11000 ? "Key đã tồn tại trong danh mục này" : "Internal Server Error" });
            }
        },
        editEnum: async (req, res) => {
            try {
                const doc = await MisaEnum.findOneAndUpdate({ _id: req.params.id }, req.body, { new: true });
                res.json({ s: 200, data: doc });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: "Internal Server Error" });
            }
        },
        deleteEnum: async (req, res) => {
            try {
                await MisaEnum.findOneAndDelete({ _id: req.params.id });
                res.json({ s: 200 });
            } catch (error) {
                Logger.error(error);
                res.status(500).json({ s: 500, message: "Internal Server Error" });
            }
        },
    };
}

module.exports = new MisaConfigController();
