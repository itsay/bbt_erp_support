'use strict'
const Tracking = require('./../../model/tracking').Tracking
/** @class TrackingController
 **/
function TrackingController() {
  const SELF = {
    IGNORE_URL: ['']
  };
  return {
    /**@memberOf TrackingController
     *
     * @param req
     * @param res
     * @param next
     */
    trackAccessUrl: (req, res, next) => {
      if (SELF.IGNORE_URL.indexOf(req.url) > -1) return next();
      const screenWidth = parseInt(
        req.headers['x-screen-width'] ||
        req.query.sw ||
        req.query.screenWidth ||
        '',
        10
      ) || undefined;
      const screenHeight = parseInt(
        req.headers['x-screen-height'] ||
        req.query.sh ||
        req.query.screenHeight ||
        '',
        10
      ) || undefined;

      const userAgent = req.headers['user-agent'];

      Tracking.create({
        url: req.url,
        method: req.method,
        ip: req.ip,
        screenWidth: screenWidth,
        screenHeight: screenHeight,
        userAgent: userAgent,
      }).catch(
        (e) => {
          console.log("trackAccessUrl", e);
        }
      );
      next();
    },
  }
}

module.exports = new TrackingController()
