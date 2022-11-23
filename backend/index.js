const path = require("path");
const dotenv = require("dotenv");
const os = require("os");
const pm2 = require("pm2");
// require("./src/utils/tool");

if (process.env.NODE_ENV === "development") {
  dotenv.config({
    path: path.join(__dirname, "./.env.development"),
  });
} else if (process.env.NODE_ENV === "production") {
  dotenv.config({
    path: path.join(__dirname, "./.env.production"),
  });
}

const uWs = require("uWebSockets.js");
const protobuf = require("protobufjs");
const userService = require("./src/service/user.service");
const { User } = require("./src/entity/User");
const locationService = require("./src/service/location.service");
const host = process.env.HOST || "localhost";
const port = Number(process.env.SERVER_PORT) || 3000;
const { Message, Field } = protobuf;
const sockets = new Map();
const locationData = new Map();
const servers = new Map();
const Queue = require("./src/model/Queue");
const maria = require("mysql2");
const { masterConfig } = require("./src/database/mariadbConf");
const { dev } = require("./src/utils/tool");
// const { latency } = require("./src/utils/tool");
// const { sql } = require("./src/database/mariadb");
// const mariadb = require("./src/database/mariadb");
const locationQueue = new Queue();
const logoutQueue = new Queue.DataQueue();
let current = 0;

// const networkInterfaces = os.networkInterfaces();

// console.log("os", networkInterfaces);

Field.d(1, "fixed32", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
Field.d(4, "float", "required")(Message.prototype, "roy");
// Field.d(1, "fixed32", "optional")(Message.prototype, "id");
// Field.d(2, "string", "optional")(Message.prototype, "nickname");
// Field.d(3, "string", "optional")(Message.prototype, "email");
// Field.d(4, "string", "optional")(Message.prototype, "password");
// Field.d(5, "fixed32", "optional")(Message.prototype, "age");
// Field.d(6, "fixed32", "optional")(Message.prototype, "birth");
// Field.d(7, "string", "optional")(Message.prototype, "nation");
// Field.d(8, "fixed32", "optional")(Message.prototype, "created_at");
// Field.d(9, "fixed32", "optional")(Message.prototype, "updated_at");
// Field.d(10, "fixed32", "optional")(Message.prototype, "user_id");
// Field.d(11, "fixed32", "optional")(Message.prototype, "server");
// Field.d(12, "string", "optional")(Message.prototype, "authority");
// Field.d(13, "string", "optional")(Message.prototype, "type");
// Field.d(14, "string", "optional")(Message.prototype, "state");
// Field.d(15, "string", "optional")(Message.prototype, "avatar");
// Field.d(16, "string", "optional")(Message.prototype, "space");
// Field.d(17, "fixed32", "optional")(Message.prototype, "pox");
// Field.d(18, "fixed32", "optional")(Message.prototype, "poy");
// Field.d(19, "fixed32", "optional")(Message.prototype, "poz");
// Field.d(20, "fixed32", "optional")(Message.prototype, "roy");
// Field.d(21, "bool", "optional")(Message.prototype, "service");
// Field.d(22, "bool", "optional")(Message.prototype, "marketing");
// Field.d(23, "bool", "optional")(Message.prototype, "personal");
// Field.d(24, "string", "optional")(Message.prototype, "cert_email");
// Field.d(25, "string", "optional")(Message.prototype, "cert_pass");

userService.addMiddleware(() => {
  maria.createConnection(masterConfig).ping((err) => {
    if (err) {
      dev.log("ping!!!");
      try {
        throw new Error("no connection!");
      } catch (e) {
        dev.alias("[ERROR] ::");
        dev.log(e.message);
      }
    }
  });
});

userService.middleware();

const app = uWs
  .App({})
  .ws("/*", {
    maxBackpressure: 2048,
    maxPayloadLength: 64 * 1024 * 1024,
    compression: uWs.SHARED_COMPRESSOR,
    idleTimeout: 64,

    upgrade: (res, req, context) => {
      const query = req.getQuery();
      const params = Object.fromEntries(
        query
          .split("&")
          .filter((q) => q)
          .map((q) => q.split("="))
      );

      res.upgrade(
        {
          server: Number(params.server || 1),
        },
        /* Spell these correctly */
        req.getHeader("sec-websocket-key"),
        req.getHeader("sec-websocket-protocol"),
        req.getHeader("sec-websocket-extensions"),
        context
      );
    },
    open: (ws) => {
      try {
        /**
         * 1. 뷰어 데이터 생성
         * 2. 뷰어 데이터 저장
         * 3. 저장 하고난 PK로 ws를 키로 맵에 저장 (소스코드)
         * 4. 플레이어 데이터 받기
         * 5. 뷰어 데이터 클라이언트로 보내기
         * 6. (옵션) 뷰어 데이터 전체 클라이언트로 뿌리기
         */
        // create user data
        const user = new User({
          type: "viewer",
          server: ws.server || 1,
        });

        // console.log("user server", ws.server);

        // insert userData
        userService.insert(user, sockets, servers, ws, app);
        // userService.findAll(ws, app);

        dev.alias("[OPEN USER INFO] ::");
        dev.log(user.id);
        locationData.set(ws, user);
        process.send(String(ws.server));
      } catch (e) {}
      // console.log("입장", sockets);
    },
    message: (ws, message, isBinary) => {
      try {
        if (isBinary) {
          const data = Message.decode(new Uint8Array(message));
          data.id = sockets.get(ws);
          current = data.id;
          dev.alias("[IS REPLACED ID] ::");
          dev.log(data.id);
          // console.log(data)
          // TODO: 분기문 수정 필요
          if (data.hasOwnProperty("pox")) {
            // TODO: update
            locationData.set(ws, Object.assign(locationData.get(ws), data));
            dev.log("[LOCATION MOVING] ::", locationData.get(ws));
            // locationService.update(sockets.get(ws), data, ws);
            // app.publish(
            //   String(ws.server),
            //   Message.encode(new Message(data)).finish(),
            //   true,
            //   true
            // );
            locationQueue.enter(Message.encode(new Message(data)).finish());
            // process.send(
            //   JSON.stringify(Object.assign(data, { server: ws.server }))
            // );
          }
        } else {
          const data = new TextDecoder().decode(message);
          const json = JSON.parse(data);
          if (json.hasOwnProperty("type")) {
            if (json.type === "viewer") {
            } else if (json.type === "player") {
              // console.log(sockets.get(ws));
              if (sockets.get(ws) !== undefined || sockets.get(ws) !== null) {
                userService.update(
                  sockets.get(ws),
                  json,
                  ws,
                  app,
                  sockets,
                  servers
                );
                locationData.set(ws, Object.assign(locationData.get(ws), json));
                // process.send(String(ws.server));
              }
            }
          } else {
          }
        }
      } catch (e) {}
    },
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      dev.alias("[SOCKET CLOSE ID] ::");
      dev.log(sockets.get(ws));
      dev.alias("[SOCKET CLOSE LOCATION DATA] ::");
      dev.log(locationData.get(ws));
      locationService.update(sockets.get(ws), locationData.get(ws), ws);
      dev.log("연결이 끊어짐!");
      try {
        const id = sockets.get(ws);
        if (id === undefined) {
          throw new Error("id is undefined");
        }
        console.log(id, "out");
        // process.send(String(ws.server));
        userService.deleteOrOfflineById(id, ws, app);
        // logoutQueue.enter([id, ws, app]);
      } catch (e) {
        /* console.log(" 여긴가?", e); */
      } finally {
        sockets.delete(ws);
      }
    },
  })
  .get("/", (res, req) => {
    res.end("test done!");
  })
  .listen(port, (token) => {
    if (token) {
      userService.initialize();
      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });

setInterval(() => {
  if (locationQueue.size() > 0) {
    const ws = servers.get(String(current));
    if (ws) {
      // latency.start("publish");
      app.publish(String(ws.server), locationQueue.get(), true, true);
      // latency.end("publish");
    }
  }
}, 16);

// setInterval(() => {
//   if (logoutQueue.size() > 0) {
//     // latency.start("publish");
//     const [id, ws, app] = logoutQueue.get();
//     userService.deleteOrOfflineById(id, ws, app);
//     // app.publish(String(ws.server), logoutQueue.get(), true, true);
//     // latency.end("publish");
//   }
// }, 16);

pm2.launchBus(function (err, pm2_bus) {
  pm2_bus.on("process:msg", function (packet) {
    // console.log(packet.raw);
    if (packet.raw.match(/[^0-9]/g)) {
      const data = JSON.parse(packet.raw);
      const server = data.server;
      delete data["server"];
      // locationQueue.enter(Message.encode(new Message(data)).finish());
      userService.broadcast(server, app);
      // app.publish(
      //   String(server),
      //   Message.encode(new Message(data)).finish(),
      //   true,
      //   true
      // );
    } else {
      const server = Number(packet.raw);
      userService.broadcast(server, app);
    }
  });
});

process.on("SIGINT", function () {
  console.log("shut down");
});
