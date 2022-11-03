const uWs = require("uWebSockets.js");
const protobuf = require("protobufjs");
const host = process.env.HOST || "localhost";
const port = Number(process.env.PORT) || 3000;
const { Message, Field } = protobuf;
const sockets = new Map();
let users = [];
let id = 0;

Field.d(1, "fixed32", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "x");
Field.d(3, "float", "required")(Message.prototype, "y");

const app = uWs
  .App({})
  .ws("/*", {
    /* Options */
    compression: uWs.SHARED_COMPRESSOR,
    // maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 32,
    /* Handlers */
    upgrade: (res, req, context) => {
      console.log(
        "An Http connection wants to become WebSocket, URL: " +
          req.getUrl() +
          "!"
      );

      /* This immediately calls open handler, you must not use res after this call */
      res.upgrade(
        {
          url: req.getUrl(),
        },
        /* Spell these correctly */
        req.getHeader("sec-websocket-key"),
        req.getHeader("sec-websocket-protocol"),
        req.getHeader("sec-websocket-extensions"),
        context
      );
    },
    open: (ws) => {
      console.log("A WebSocket connected!");
      ws.subscribe("broadcast");
      ws.subscribe(String(id));
      sockets.set(ws, {
        id,
        type: "viewer",
      });
      users.push(sockets.get(ws));
      ws.send(JSON.stringify(sockets.get(ws)));
      ws.publish("broadcast", JSON.stringify(users));
      console.log(id);
      id++;
    },
    message: (ws, message, isBinary) => {
      /* Ok is false if backpressure was built up, wait for drain */
      if (isBinary) {
        const data = Message.decode(new Uint8Array(message));
        if (data.hasOwnProperty("x")) {
          users = users.map((user) =>
            user.id === data.id ? Object.assign(user, data) : user
          );
          app.publish("broadcast", message, isBinary, true);
        }
      } else {
        const data = new TextDecoder().decode(message);
        const json = JSON.parse(data);
        if (json.hasOwnProperty("type")) {
          if (json.type === "viewer") {
            console.log("viewer!");
          } else if (json.type === "player") {
            sockets.set(ws, Object.assign(sockets.get(ws), json));
            users = users.map((user) =>
              user.id === sockets.get(ws).id
                ? Object.assign(user, sockets.get(ws))
                : user
            );
            ws.send(JSON.stringify(sockets.get(ws)));
            ws.send(JSON.stringify(users));
            ws.publish("broadcast", JSON.stringify(users));
          }
        } else {
          console.log(json);
        }
      }
    },
    drain: (ws) => {
      console.log("WebSocket backpressure: " + ws.getBufferedAmount());
    },
    close: (ws, code, message) => {
      console.log("WebSocket closed");
    },
  })
  .listen(port, (token) => {
    if (token) {
      console.log("Listening to port " + port);
    } else {
      console.log("Failed to listen to port " + port);
    }
  });
