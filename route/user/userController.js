"use strict";
const Logger = require("./../util/logController").Logger;
const path = require("path");
const fs = require("fs");
const { Staff } = require("./../../model/user");

/** @class UserController */
function UserController() {
  const SELF = {};
  return {
    listStaff: async (req, res) => {
      try {
        const staffs = await Staff.find({});
        res.json({ staffs: staffs });
      } catch (err) {
        Logger.error(err);
        res.status(500).send("Internal Server Error");
      }
    },
    getStaff: async (req, res) => {
      try {
        const { id } = req.params;
        const staff = await Staff.findById(id);
        if (!staff) {
          return res.status(404).send("Staff not found.");
        }
        res.json({ staff: staff });
      } catch (error) {
        Logger.error(err);
        res.status(500).send("Internal Server Error");
      }
    },
    createStaff: async (req, res) => {
      try {
        const staff = new Staff(req.body);
        await staff.save();
        res.json(staff);
      } catch (err) {
        Logger.error(err);
        res.status(500).send("Internal Server Error");
      }
    },
    updateStaff: async (req, res) => {
      try {
        const staff = await Staff.findOneAndUpdate(
          {
            _id: req.params.id,
          },
          req.body,
          { new: true }
        );
        res.json(staff);
      } catch (err) {
        Logger.error(err);
        res.status(500).send("Internal Server Error");
      }
    },
    deleteStaff: async (req, res) => {
      try {
        await Staff.findOneAndDelete({
          _id: req.params.id,
        });
        res.json({ message: "Staff deleted" });
      } catch (err) {
        Logger.error(err);
        res.status(500).send("Internal Server Error");
      }
    },
  };
}
module.exports = new UserController();
