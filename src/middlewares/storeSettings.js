const db = require('../../config/database');

const checkStoreStatus = async (req, res, next) => {
  try {
    const settingObj = await db('store_settings').where({ key: 'pause_orders' }).first();
    let pauseSettings = { enabled: false };
    
    if (settingObj && settingObj.value) {
      pauseSettings = JSON.parse(settingObj.value);
    }

    if (pauseSettings.enabled) {
      const now = new Date();
      let isActive = true;

      if (pauseSettings.startDate && new Date(pauseSettings.startDate) > now) {
        isActive = false;
      }
      
      if (pauseSettings.endDate && new Date(pauseSettings.endDate) < now) {
        isActive = false;
      }

      if (isActive) {
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1) || req.path.includes('/cart/add') || req.path.includes('/api/hampers')) {
          // It's an AJAX request (like clicking 'Add' on catalog)
          return res.json({ success: false, error: pauseSettings.message || 'Store is currently not taking orders.' });
        } else {
          // Standard page load (e.g., trying to access /checkout directly)
          return res.render('user/store-paused', { 
            title: 'Store Paused', 
            message: pauseSettings.message || 'Store is currently not taking orders.'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in store status middleware:', error);
  }
  
  next();
};

module.exports = {
  checkStoreStatus
};
