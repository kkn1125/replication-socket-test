const path = require("path");
require("./src/utils/tool");
require("dotenv").config({
  path: path.join(__dirname, "./.env"),
});

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
const locationQueue = new Queue();
let current = 0;

const os = require('os');

const networkInterfaces = os.networkInterfaces();

console.log(networkInterfaces);

Field.d(1, "fixed32", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");

const app = uWs
  .App({})
  .ws("/*", {
    // maxPayloadLength: 16 * 1024 * 1024,
    compression: uWs.SHARED_COMPRESSOR,
    idleTimeout: 32,

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
          locationQueue.enter(message);
        }
      } else {
        const data = new TextDecoder().decode(message);
        const json = JSON.parse(data);
        if (json.hasOwnProperty("type")) {
          if (json.type === "viewer") {
          } else if (json.type === "player") {
            userService.update(sockets.get(ws), json, ws, app);
          }
        } else {
        }
      }
    },
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      console.log(sockets.get(ws), "out");
      userService.deleteOrOfflineById(sockets.get(ws), ws, app);
      sockets.delete(ws);
    },
  })
  .get("/", (res, req) => {
    res.end("test done!");
  })
  .listen(port, (token) => {
    if (token) {
      userService.initialize();
      console.log("Listening to port " + port);
      console.log(process.env.HOST)
    } else {
      console.log("Failed to listen to port " + port);
    }
  });

setInterval(() => {
  if (locationQueue.size() > 0) {
    const ws = servers.get(String(current));
    // app.publish("broadcast", locationQueue.get(), true, true);
    app.publish(String(ws.server), locationQueue.get(), true, true);
  }
}, 16);
