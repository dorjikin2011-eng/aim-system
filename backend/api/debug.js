module.exports = async (req, res) => {
  try {
    console.log('=== Debug endpoint started ===');
    console.log('Trying to require app from ../dist/server');
    
    // Try to load the app
    const app = require('../dist/server');
    console.log('App loaded successfully, type:', typeof app);
    
    // Check if app is a function
    if (typeof app === 'function') {
      console.log('App is a function, calling it...');
      await app(req, res);
    } else {
      console.log('App is not a function, it\'s a:', typeof app);
      res.status(500).json({
        error: 'App is not a function',
        type: typeof app,
        keys: Object.keys(app || {})
      });
    }
  } catch (error) {
    console.error('Error in debug endpoint:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Failed to load app',
      message: error.message,
      stack: error.stack
    });
  }
};
