const { sql } = require("../database/mariadb");
const { Locations, User } = require("../entity/User");

Locations.update = (id, data) => {
  const user = new User(data);
  const location = user.getLocation();
  sql.query("UPDATE locations SET ? WHERE user_id=?", [location, id]);
};

module.exports = locationsService = Locations;
