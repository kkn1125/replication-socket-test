const maria = require("mysql2");
const { sql, slave } = require("../database/mariadb");
const { masterConfig } = require("../database/mariadbConf");
const { slaveConfig } = require("../database/slaveConf");
const { User } = require("../entity/User");
const { latency, dev } = require("../utils/tool");

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

User.middlewares = [];

User.addMiddleware = function (...middlewares) {
  this.middlewares.push(...middlewares);
};

User.middleware = function (once) {
  dev.alias("[MIDDLEWARE] ::");
  dev.log(`미들웨어 실행 개수 ${this.middlewares.length}개`);
  if (this.middlewares.length > 0) {
    for (let cb of this.middlewares) {
      try {
        dev.alias(`[${cb.name}] ::`);
        dev.log("미들웨어 영역");
        cb.call(this);
      } catch (e) {
        console.log("try catch", e);
        return false;
      }
    }
  }
  if (once) {
    once.call(this);
    dev.alias(`[MIDDLEWARE ONCE] ::`);
    dev.log(once.name);
  }
  return this;
};

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
      dev.log("[FINDALL] ::", rows.length);
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

User.insert = (data, sockets, servers, ws, app) => {
  const user = new User(data);
  const base = user.getBaseInfo();
  const location = user.getLocation();
  const cert = user.getCertifications();
  const agrees = user.getAgreements();

  delete base["id"];
  dev.alias("[INSERT USER INFO] ::");
  dev.log(user.getAll());

  sql
    .promise()
    .query("INSERT INTO user SET ?", base)
    .then(async ([rows, fields]) => {
      try {
        ws.subscribe("broadcast");
        ws.subscribe(String(rows.insertId));
        ws.subscribe(String(ws.server));
      } catch (e) {
        dev.log("lose socket to insert");
      }

      sockets.set(ws, rows.insertId);
      servers.set(String(rows.insertId), ws);

      location.user_id = rows.insertId;
      cert.user_id = rows.insertId;
      agrees.user_id = rows.insertId;
      // console.log(location);
      await sql.promise().query("INSERT INTO locations SET ?", [location]);
      await sql.promise().query("INSERT INTO agreements SET ?", [agrees]);
      await sql.promise().query("INSERT INTO certifications SET ?", [cert]);

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
          dev.log("[FINDALL] ::", rows.length);
          ws.send(JSON.stringify(rows));
          // ws.publish(JSON.stringify(rows));
          // app.publish(String(ws.server), JSON.stringify(rows));
          // latency.end("findall");
        })
        .catch((e) => {
          console.log(e);
          console.log("error skip");
        });
    })
    .catch((e) => {
      dev.alias("[ERROR] ::");
      dev.log(e);
      dev.alias("[ERROR] ::");
      dev.log("skip error");
    });
};

User.update = async (id, data, ws, app, sockets, servers) => {
  if (id === undefined || id === null) return;
  let existsId = null;
  const user = new User(data);

  const base = user.getBaseInfo();
  delete base["id"];
  if (base.nickname === "guest") {
    base.nickname += id;
  } else {
    const [foundId, fields] = await sql
      .promise()
      .query(`SELECT id FROM user WHERE nickname=?`, [base.nickname]);
    existsId = foundId?.[0]?.id;
    if (existsId) {
      sockets.set(ws, existsId);
      servers.set(String(existsId), ws);
      const [result] = await sql
        .promise()
        .query("DELETE FROM user WHERE id=?", [id]);
      console.log(result);
    }
  }

  const location = user.getLocation();
  const cert = user.getCertifications();
  const agrees = user.getAgreements();
  Object.assign(location, { server: ws.server });

  // const masterPool = maria.createPool(masterConfig).promise();
  // const masterCon = await masterPool.getConnection();
  // masterCon.beginTransaction();

  if (Object.keys(base).length !== 0) {
    await sql
      .promise()
      .query("UPDATE user SET ? WHERE id=?", [base, existsId || id]);
  }

  if (Object.keys(location).length !== 0) {
    if (existsId !== null) {
      delete location["pox"];
      delete location["poy"];
      delete location["poz"];
      delete location["roy"];
      await sql
        .promise()
        .query("UPDATE locations SET ? WHERE user_id=?", [location, existsId]);
    } else {
      await sql
        .promise()
        .query("UPDATE locations SET ? WHERE user_id=?", [location, id]);
    }
  }
  if (Object.keys(agrees).length !== 0) {
    await sql
      .promise()
      .query("UPDATE agreements SET ? WHERE user_id=?", [
        agrees,
        existsId || id,
      ]);
  }
  if (Object.keys(cert).length !== 0) {
    await sql
      .promise()
      .query("UPDATE certifications SET ? WHERE user_id=?", [
        cert,
        existsId || id,
      ]);
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
      [existsId || id, ws.server]
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
        })
        .catch((e) => {
          dev.log("keys :");
          Object.keys(e);
        });
    })
    .catch((e) => {
      console.log("lose socket to update");
    });

  // masterCon.commit();
  // masterCon.release();
};

User.deleteOrOfflineById = async (id, ws, app) => {
  const [found, fields] = await sql.promise().query(
    `
      SELECT *
      FROM user
      WHERE id=?
      AND (nickname LIKE 'guest%' OR nickname = '')
      `,
    [id]
  );
  dev.alias("[DELETE FOUND PLAYERS] ::");
  dev.log(found);
  const query =
    found.length === 0
      ? `
        UPDATE locations
        SET type='offline'
        WHERE user_id=?
        `
      : "DELETE FROM user WHERE id=?";
  dev.log("id is", id);
  dev.alias("[CHECK] ::");
  dev.log(query, id);
  await sql.promise().query(query, id);
  const [rows] = await sql.promise().query(
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
  );
  dev.alias("[DELETE ROWS] ::");
  dev.log(rows);
  app.publish(String(ws.server), JSON.stringify(rows));
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
