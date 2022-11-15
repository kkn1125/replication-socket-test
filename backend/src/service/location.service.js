const { sql } = require("../database/mariadb");
const { Locations, User } = require("../entity/User");
const { latency } = require("../utils/tool");

Locations.update = (id, data, ws) => {
  // latency.start("location latency");
  const user = new User(data);
  const location = user.getLocation();
  Object.assign(location, { server: ws.server });
  sql
    .promise()
    .query("UPDATE locations SET ? WHERE user_id=?", [location, id])
    // .then(() => {
    //   latency.end("location latency");
    // });
};

module.exports = locationsService = Locations;
