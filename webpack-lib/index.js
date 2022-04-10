if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/add.min');
} else {
  module.exports = require('./dist/add');
}
