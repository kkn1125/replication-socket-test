const { sql, slave } = require("../database/mariadb");
const { Locations, User } = require("../entity/User");
const { latency, dev } = require("../utils/tool");

Locations.update = (id, data, ws) => {
  // latency.start("location latency");
  const user = new User(data);
  const location = user.getLocation();
  Object.assign(location, { server: ws.server });
  slave
    .promise()
    .query("UPDATE locations SET ? WHERE user_id=?", [location, id])
    .then(() => {
      dev.alias("[LOCATION USER ID] ::");
      dev.log(id);
      dev.alias("[LOCATION SERVER] ::");
      dev.log(ws.server);
      dev.log("===========================================");
      // latency.end("location latency");
    })
    .catch((e) => {
      dev.alias("[LOCATION ERROR] ::");
      dev.log(e);
    });
};

module.exports = locationsService = Locations;
