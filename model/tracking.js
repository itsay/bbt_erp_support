'use strict';
const mongoose = require('mongoose')

/** @class Tracking
 * @description
 */
const Tracking = mongoose.Schema({
  user: { type: String },
  url: { type: String },
  method: { type: String },
  screenWidth: { type: Number },
  screenHeight: { type: Number },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now },
  userAgent: { type: String }
}, { versionKey: false, timestamps: false })

/**@memberOf Tracking*/
Tracking.statics.objectId = function (id) {
  return mongoose.Types.ObjectId(id)
}

const _tracking = mongoose.model('tracking', Tracking)

module.exports = {
  Tracking: _tracking
}
