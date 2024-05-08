const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const shortid = require("shortid");
const path = require("path");
const dbPath = path.resolve(__dirname, "../db/db.json")
const adapter = new FileSync(dbPath);
const db = low(adapter);

exports.db = db;
exports.shortid = shortid;
exports.account = 'account'
