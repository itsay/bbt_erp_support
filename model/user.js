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


module.exports = {
  Staff: mongoose.model("staff", Staff),
};
