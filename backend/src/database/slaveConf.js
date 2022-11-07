const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "./../../.env"),
});

// mariadb informations
const { SLAVE_PORT, SLAVE_HOST, SLAVE_USERNAME, SLAVE_PW, SLAVE_DATABASE } =
  process.env;

module.exports.slaveConfig = {
  host: SLAVE_HOST,
  port: Number(SLAVE_PORT),
  user: SLAVE_USERNAME,
  password: String(SLAVE_PW),
  database: SLAVE_DATABASE || "",
};
