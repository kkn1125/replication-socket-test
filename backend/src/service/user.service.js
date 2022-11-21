const maria = require("mysql2");
const { sql, slave } = require("../database/mariadb");
const { masterConfig } = require("../database/mariadbConf");
const { slaveConfig } = require("../database/slaveConf");
const { User } = require("../entity/User");
const { latency } = require("../utils/tool");

class QueryQueue {
  #queue = [];
  #master;
  #slave;
  constructor() {
    this.#master = sql;
    this.#slave = slave;
  }
  add(exec) {
    this.#queue.push(exec);
  }
  execute() {
    this.#queue.shift().call();
  }
  isEmpty() {
    return this.#queue.length === 0;
  }
}

const queryQueue = new QueryQueue();

User.broadcast = (server, app) => {
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
      AND locations.server = ?
      `,
      [server]
    )
    .then(([rows, fields]) => {
      app.publish(String(server), JSON.stringify(rows));
    })
    .catch((e) => {
      console.log(e);
      console.log("error skip in broadcast");
    });
};

User.findAll = (ws, app) => {
  // latency.start("findall");

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
      AND locations.server = ?
      `,
      [ws.server]
    )
    .then(([rows, fields]) => {
      // console.log("findall", rows.length);
      ws.send(JSON.stringify(rows));
      app.publish(String(ws.server), JSON.stringify(rows));
      // latency.end("findall");
    })
    .catch((e) => {
      console.log(e);
      console.log("error skip");
    });
};

User.findByType = (type) => {
  slave.query("SELECT * FROM user WHERE type=?", type);
};

User.insert = (data, sockets, servers, ws) => {
  const user = new User(data);
  const base = user.getBaseInfo();
  const location = user.getLocation();
  const cert = user.getCertifications();
  const agrees = user.getAgreements();

  delete base["id"];

  sql
    .promise()
    .query("INSERT INTO user SET ?", base)
    .then(async ([rows, fields]) => {
      try {
        ws.subscribe("broadcast");
        ws.subscribe(String(rows.insertId));
        ws.subscribe(String(ws.server));
      } catch (e) {
        console.log("lose socket to insert");
      }

      sockets.set(ws, rows.insertId);

      location.user_id = rows.insertId;
      cert.user_id = rows.insertId;
      agrees.user_id = rows.insertId;
      servers.set(String(rows.insertId), ws);
      // console.log(location);
      await sql.promise().query("INSERT INTO locations SET ?", [location]);
      await sql.promise().query("INSERT INTO agreements SET ?", [agrees]);
      await sql.promise().query("INSERT INTO certifications SET ?", [cert]);
    })
    .catch((e) => {
      console.log(e);
      console.log("skip error");
    });
};

User.update = async (id, data, ws, app) => {
  if (id === undefined || id === null) return;
  const user = new User(data);

  const base = user.getBaseInfo();
  delete base["id"];
  if (base.nickname === "guest") base.nickname += id;

  const location = user.getLocation();
  const cert = user.getCertifications();
  const agrees = user.getAgreements();
  Object.assign(location, { server: ws.server });

  const masterPool = maria.createPool(masterConfig).promise();
  const masterCon = await masterPool.getConnection();
  masterCon.beginTransaction();

  if (Object.keys(base).length !== 0) {
    await sql.promise().query("UPDATE user SET ? WHERE id=?", [base, id]);
  }
  if (Object.keys(location).length !== 0) {
    await sql
      .promise()
      .query("UPDATE locations SET ? WHERE user_id=?", [location, id]);
  }
  if (Object.keys(agrees).length !== 0) {
    await sql
      .promise()
      .query("UPDATE agreements SET ? WHERE user_id=?", [agrees, id]);
  }
  if (Object.keys(cert).length !== 0) {
    await sql
      .promise()
      .query("UPDATE certifications SET ? WHERE user_id=?", [cert, id]);
  }
  // masterCon.commit();
  // masterCon.release();

  // const slavePool = maria.createPool(slaveConfig).promise();
  // const slaveCon = await slavePool.getConnection();
  // slaveCon.beginTransaction();

  sql
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
      AND locations.server = ?
    `,
      [id, ws.server]
    )
    .then(([rows1, fields1]) => {
      ws.send(JSON.stringify(rows1[0]));
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
          AND locations.server = ?
          `,
          [ws.server]
        )
        .then(([rows2, fileds2]) => {
          // console.log("update rows2", rows2.length);
          // console.log(rows2[0]);
          ws.send(JSON.stringify(rows2));
          app.publish(String(ws.server), JSON.stringify(rows2));
        });
    })
    .catch((e) => {
      console.log("lose socket to update");
    });

  // masterCon.commit();
  // masterCon.release();
};

User.deleteOrOfflineById = (id, ws, app) => {
  sql
    .promise()
    .query(
      `
      SELECT *
      FROM user
      WHERE id=?
      AND (nickname LIKE 'guest%' OR nickname = '')
      `,
      [id]
    )
    .then(([found, fields]) => {
      // console.log(found);
      const query =
        found.length === 0
          ? `
            UPDATE locations
            SET type='offline'
            WHERE user_id=?
            `
          : "DELETE FROM user WHERE id=?";
      console.log("id", id);
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
              AND locations.server=?
              `,
              [ws.server]
            )
            .then(([rows]) => {
              // console.log("after delete", rows);
              app.publish(String(id), JSON.stringify(rows));
              app.publish(String(ws.server), JSON.stringify(rows));
            })
            .catch((e) => {
              console.log("second select error", e);
            });
        })
        .catch((e) => {
          console.log("wrap error", e);
        });
    })
    .catch((e) => {
      console.log("select error", e);
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

  sql.query("show variables like 'max_connections%'", (err, rows) => {
    console.log(`set max connection in master`, rows);
  });

  slave.query("show variables like 'max_connections%'", (err, rows) => {
    console.log(`set max connection in slave`, rows);
  });
};

module.exports = userService = User;
