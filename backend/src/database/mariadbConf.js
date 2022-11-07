const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "./../../.env"),
});

// mariadb informations
const { DB_PORT, DB_HOST, DB_USERNAME, DB_PW, DB_DATABASE } = process.env;

module.exports.masterConfig = {
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USERNAME,
  password: String(DB_PW),
  database: DB_DATABASE || "",
};
