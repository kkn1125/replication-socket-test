const maria = require("mysql2");
const { sql, slave } = require("../database/mariadb");
const { masterConfig } = require("../database/mariadbConf");
const { slaveConfig } = require("../database/slaveConf");
const { User } = require("../entity/User");

User.findAll = (ws) => {
  slave
    .promise()
    .query(
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
    `
    )
    .then(([rows, fields]) => {
      ws.send(JSON.stringify(rows));
      ws.publish("broadcast", JSON.stringify(rows));
    });
};

User.findByType = (type) => {
  slave.query("SELECT * FROM user WHERE type=?", type);
};

User.playerSend = (id, ws) => {
  slave
    .promise()
    .query(
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
      id
    )
    .then(([rows, fields]) => {
      ws.send(JSON.stringify(rows[0]));
    });
  slave
    .promise()
    .query(
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
      `
    )
    .then(([rows, fields]) => {
      ws.send(JSON.stringify(rows));
      ws.publish("broadcast", JSON.stringify(rows));
    });
};

User.insert = (data, ws, sockets) => {
  const user = new User(data);
  const base = user.getBaseInfo();
  const location = user.getLocation();
  const cert = user.getCertifications();
  const agrees = user.getAgreements();

  delete base["id"];

  ws.subscribe("broadcast");
  sql
    .promise()
    .query("INSERT INTO user SET ?", base)
    .then(([rows, fields]) => {
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

User.update = (id, data, ws) => {
  const pipeline = [];
  const user = new User(data);

  const base = user.getBaseInfo();
  delete base["id"];
  if (base.nickname === "guest") base.nickname += id;

  const location = user.getLocation();
  const cert = user.getCertifications();
  const agrees = user.getAgreements();

  if (Object.keys(base).length !== 0) {
    pipeline.push(
      sql.promise().query("UPDATE user SET ? WHERE id=?", [base, id])
    );
  }
  if (Object.keys(location).length !== 0) {
    pipeline.push(
      sql
        .promise()
        .query("UPDATE locations SET ? WHERE user_id=?", [location, id])
    );
  }
  if (Object.keys(agrees).length !== 0) {
    pipeline.push(
      sql
        .promise()
        .query("UPDATE agreements SET ? WHERE user_id=?", [agrees, id])
    );
  }
  if (Object.keys(cert).length !== 0) {
    pipeline.push(
      sql
        .promise()
        .query("UPDATE certifications SET ? WHERE user_id=?", [cert, id])
    );
  }

  Promise.all(pipeline).then((/* results */) => {
    slave
      .promise()
      .query(
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
        WHERE user.id = ?
        `,
        id
      )
      .then(([rows, fields]) => {
        ws.send(JSON.stringify(rows[0]));
        slave
          .promise()
          .query(
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
            WHERE locations.type = 'player'
            `
          )
          .then(([rows, fields]) => {
            ws.send(JSON.stringify(rows));
            ws.publish("broadcast", JSON.stringify(rows));
          });
      });
  });
};

User.deleteOrOfflineById = (id, app) => {
  sql
    .promise()
    .query(
      `
      SELECT *
      FROM user
      WHERE id=?
      AND (nickname LIKE 'guest%' OR nickname = '')
      `,
      id
    )
    .then(([found, fields]) => {
      const query =
        found.length === 0
          ? `
            UPDATE locations
            SET type='offline'
            WHERE user_id=?
            `
          : "DELETE FROM user WHERE id=?";

      sql
        .promise()
        .query(query, id)
        .then(() => {
          sql
            .promise()
            .query(
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
                WHERE locations.type = 'player'
                `
            )
            .then(([rows]) => {
              app.publish("broadcast", JSON.stringify(rows));
            });
        });
    });
};

User.initialize = () => {
  // guest or 빈 닉네임의 유저 중에 offline인 유저를 삭제한다.
  sql.query(
    `
    DELETE FROM user
    WHERE id
    IN (
      SELECT user_id
      FROM locations
      WHERE type='offline'
      )
    AND nickname
    LIKE 'guest%'
    OR nickname=''
    `
  );
  sql.query("UPDATE locations SET type='offline'");
};

module.exports = userService = User;
