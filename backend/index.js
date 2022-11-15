const path = require("path");
const dotenv = require("dotenv");
const os = require("os");
require("./src/utils/tool");

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
const port = Number(process.env.PORT) || 3000;
const { Message, Field } = protobuf;
const sockets = new Map();
const servers = new Map();
const Queue = require("./src/model/Queue");
const { latency } = require("./src/utils/tool");
const locationQueue = new Queue();
let current = 0;

const networkInterfaces = os.networkInterfaces();

console.log("os", networkInterfaces);

Field.d(1, "fixed32", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
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

const app = uWs
  .App({})
  .ws("/*", {
    // maxPayloadLength: 16 * 1024 * 1024,
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

      // insert userData
      userService.insert(user, sockets, servers, ws);
      userService.findAll(ws, app);

      // console.log("입장", sockets);
    },
    message: (ws, message, isBinary) => {
      try {
        if (isBinary) {
          const data = Message.decode(new Uint8Array(message));
          data.id = sockets.get(ws);
          current = data.id;

          // TODO: 분기문 수정 필요
          if (data.hasOwnProperty("pox")) {
            // TODO: update
            locationService.update(sockets.get(ws), data, ws);
            // app.publish(
            //   String(ws.server),
            //   Message.encode(new Message(data)).finish(),
            //   true,
            //   true
            // );
            locationQueue.enter(Message.encode(new Message(data)).finish());
          }
        } else {
          const data = new TextDecoder().decode(message);
          const json = JSON.parse(data);
          if (json.hasOwnProperty("type")) {
            if (json.type === "viewer") {
            } else if (json.type === "player") {
              // console.log(sockets.get(ws));
              if (sockets.get(ws) !== undefined || sockets.get(ws) !== null) {
                userService.update(sockets.get(ws), json, ws, app);
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
      try {
        console.log(sockets.get(ws), "out");
        userService.deleteOrOfflineById(sockets.get(ws), ws, app);
        sockets.delete(ws);
      } catch (e) {}
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
    console.log(ws.server)
    if (ws) {
      // app.publish("broadcast", locationQueue.get(), true, true);
      // for (let temp = 0; temp < get.byteLength; temp += 15) {
      app.publish(String(ws.server), locationQueue.get(), true, true);
      // }
    }
  }
}, 16);

process.on("SIGINT", function () {
  console.log("shut down");
});
