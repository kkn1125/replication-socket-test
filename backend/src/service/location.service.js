const { sql } = require("../database/mariadb");
const { Locations, User } = require("../entity/User");

Locations.update = (id, data, ws) => {
  const user = new User(data);
  const location = user.getLocation();
  console.log("data", data);
  sql.query("UPDATE locations SET ? WHERE user_id=?", [location, id]);
};

module.exports = locationsService = Locations;
