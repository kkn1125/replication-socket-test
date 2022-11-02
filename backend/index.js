const uWs = require("uWebSockets.js");
const protobuf = require("protobufjs");
const host = process.env.HOST || "localhost";
const port = Number(process.env.PORT) || 3000;
const { Message, Field } = protobuf;
const sockets = new Map();
const users = new Map();
let id = 0;

Field.d(1, "string", "required")(Message.prototype, "nickname");
Field.d(2, "float", "required")(Message.prototype, "x");
Field.d(3, "float", "required")(Message.prototype, "y");

uWs
  .App({})
  .ws("/*", {
    /* Options */
    compression: uWs.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 10,
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
      users.set(id, ws);
      ws.send(JSON.stringify(sockets.get(ws)));
      id++;
    },
    message: (ws, message, isBinary) => {
      /* Ok is false if backpressure was built up, wait for drain */
      if (isBinary) {
        const data = Message.decode(new Uint8Array(message));
        if (data.hasOwnProperty("pox")) {
          let ok = ws.send(message, isBinary);
        }
      } else {
        const data = new TextDecoder().decode(message);
        if (data.hasOwnProperty("type")) {
          console.log("player");
        } else {
          console.log("viewer");
        }
        let ok = ws.send(message, isBinary);
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
