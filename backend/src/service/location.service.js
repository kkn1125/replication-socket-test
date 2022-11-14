const { sql } = require("../database/mariadb");
const { Locations, User } = require("../entity/User");

Locations.update = (id, data, ws) => {
  console.time("update");

  const user = new User(data);
  const location = user.getLocation();
  Object.assign(location, { server: ws.server });
  sql
    .promise()
    .query("UPDATE locations SET ? WHERE user_id=?", [location, id])
    .then(() => {
      console.timeEnd("update");
    });
};

module.exports = locationsService = Locations;
