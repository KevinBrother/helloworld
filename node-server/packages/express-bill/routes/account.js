var express = require('express');
var router = express.Router();
const {db, shortid, account} = require('../utils/lowdb');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('form');
});

router.post('/add', function(req, res, next) {
  console.log("🚀 ~ router.post ~ req:", req.body)
  const {name, date, type, amount, desc} = req.body;
  const id = shortid.generate();
  db.get(account).push({id, name, date, type, amount, desc}).write();
  res.render('index', { title: 'Express' });
});

module.exports = router;
