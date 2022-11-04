const { sql } = require("../database/mariadb");
const { User } = require("../entity/User");

User.findAll = (ws) => {
  sql.query(
    `
    SELECT user.*,
    locations.*,
    certifications.email 'cert_email',
      certifications.password 'cert_pass',
      agreements.*
    FROM user
    LEFT OUTER JOIN locations
    ON user.id = locations.user_id
    LEFT OUTER JOIN certifications
    ON user.id = certifications.user_id
    LEFT OUTER JOIN agreements
    ON user.id = agreements.user_id
    WHERE locations.type = 'player';
    `,
    (err, rows) => {
      ws.send(JSON.stringify(rows));
      ws.publish("broadcast", JSON.stringify(rows));
    }
  );
};

User.findByType = (type) => {
  sql.query("SELECT * FROM user WHERE type=?", type);
};

User.playerSend = (id, ws) => {
  sql.query(
    `
    SELECT user.id,
    locations.type,
    locations.pox,
    locations.poy,
    locations.poz,
    locations.roy
    FROM user
    LEFT JOIN locations
    ON user.id = locations.user_id
    WHERE user.id = ?;
    `,
    id,
    (err, rows) => {
      console.log("player send", rows[0]);
      ws.send(JSON.stringify(rows[0]));
    }
  );
  sql.query(
    `
    SELECT user.*,
    locations.*,
    certifications.email 'cert_email',
      certifications.password 'cert_pass',
      agreements.*
    FROM user
    LEFT OUTER JOIN locations
    ON user.id = locations.user_id
    LEFT OUTER JOIN certifications
    ON user.id = certifications.user_id
    LEFT OUTER JOIN agreements
    ON user.id = agreements.user_id
    WHERE locations.type = 'player';
    `,
    (err, rows) => {
      console.log("player send", rows);
      ws.send(JSON.stringify(rows));
      ws.publish("broadcast", JSON.stringify(rows));
    }
  );
};

User.insert = (data, ws, sockets) => {
  const user = new User(data);
  const base = user.getBaseInfo();
  const location = user.getLocation();
  const cert = user.getCertifications();
  const agrees = user.getAgreements();
  delete base["id"];
  ws.subscribe("broadcast");
  sql.query("INSERT INTO user SET ?", base, (err, rows) => {
    ws.subscribe(String(rows.insertId));
    sockets.set(ws, rows.insertId);

    location.user_id = rows.insertId;
    cert.user_id = rows.insertId;
    agrees.user_id = rows.insertId;

    sql.query("INSERT INTO locations SET ?", [location]);
    sql.query("INSERT INTO agreements SET ?", [agrees]);
    sql.query("INSERT INTO certifications SET ?", [cert]);
  });
};

User.update = (id, data) => {
  const user = new User(data);
  const base = user.getBaseInfo();
  const location = user.getLocation();
  const cert = user.getCertifications();
  const agrees = user.getAgreements();
  if (base.nickname === "guest") {
    base.nickname += id;
  }
  delete base["id"];
  Object.keys(base).length !== 0 &&
    sql.query("UPDATE user SET ? WHERE id=?", [base, id]);
  Object.keys(location).length !== 0 &&
    sql.query("UPDATE locations SET ? WHERE user_id=?", [location, id]);
  Object.keys(agrees).length !== 0 &&
    sql.query("UPDATE agreements SET ? WHERE user_id=?", [agrees, id]);
  Object.keys(cert).length !== 0 &&
    sql.query("UPDATE certifications SET ? WHERE user_id=?", [cert, id]);
};

User.deleteOrOfflineById = (id, app) => {
  sql.query(
    "SELECT * FROM user WHERE id=? AND (nickname LIKE 'guest%' OR nickname = '');",
    id,
    (err, found) => {
      console.log(found);
      if (found.length === 0) {
        sql.query("UPDATE locations SET type='offline' WHERE user_id=?", id);
      } else {
        sql.query("DELETE FROM user WHERE id=?", id, (err, rows) => {
          console.log("deletion", rows);
        });
      }
    }
  );
  sql.query(
    `
    SELECT user.*,
    locations.*,
    certifications.email 'cert_email',
      certifications.password 'cert_pass',
      agreements.*
    FROM user
    LEFT OUTER JOIN locations
    ON user.id = locations.user_id
    LEFT OUTER JOIN certifications
    ON user.id = certifications.user_id
    LEFT OUTER JOIN agreements
    ON user.id = agreements.user_id
    WHERE locations.type = 'player';
    `,
    (err, rows) => {
      app.publish("broadcast", JSON.stringify(rows));
    }
  );
};

User.initialize = () => {
  // guest or 빈 닉네임의 유저 중에 offline인 유저를 삭제한다.
  sql.query(
    "DELETE FROM user WHERE id IN (SELECT user_id FROM locations WHERE type='offline') AND nickname LIKE 'guest%' OR nickname=''"
  );
  sql.query("UPDATE locations SET type='offline'");
};

module.exports = userService = User;
