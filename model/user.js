"use strict";
const mongoose = require("mongoose");
const StatusUserEnum = require("./../common/enums/status-user.enum");
/** @class Staff
 * @description
 */

const Staff = mongoose.Schema(
  {
    codeUser: { type: String, unique: true },
    fullName: { type: String },
    title: { type: String },
    mail: { type: String, unique: true },
    phoneNum: { type: String },
    status: {
      type: String,
      enum: StatusUserEnum,
      default: StatusUserEnum.ACTIVE,
    } /* Active/Deactivate */,
    password: { type: String },
  },
  { versionKey: false, timestamps: true, strict: false }
);

const User = mongoose.Schema({
    campaignId: { type: String },
    email: { type: String },
    group: { type: String }, // Nhóm quyền
    password: { type: String }
}, { versionKey: false, timestamps: true })

const Group = mongoose.Schema({
    name: { type: String },
    permissions: { type: Array },
    users: { type: Array }, // Array of user _id strings
})


module.exports = {
  Staff: mongoose.model("staff", Staff),
  User: mongoose.model('bbt_user', User),
  Group: mongoose.model('bbt_group', Group),
};
