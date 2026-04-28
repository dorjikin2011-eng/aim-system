// Import the compiled Express app from dist
const app = require('../dist/server');

module.exports = (req, res) => {
  app(req, res);
};
