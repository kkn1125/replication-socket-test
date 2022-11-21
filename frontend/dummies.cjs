const WebSocket = require("ws");

const protobuf = require("protobufjs");
const { Message, Field } = protobuf;

Field.d(1, "fixed32", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");
Field.d(4, "float", "required")(Message.prototype, "roy");

let START = 1;
let AMOUNT = 100;
let MAX = AMOUNT + START;
const sockets = new Map();
let users = [];
let user = {};

function viewer() {
  for (let i = START; i < MAX; i++) {
    let ws = new WebSocket(
      // `ws://localhost:30${((i - 1) % 12).toString().padStart(2, 0)}/?server=1`
      `ws://localhost:3000/?server=1`
    );
    ws.binaryType = "arraybuffer";
    ws.onopen = (e) => {
      console.log("connected!");
    };
    ws.onmessage = (message) => {
      const { data } = message;
      if (data instanceof ArrayBuffer) {
        for (let i = 0; i < Math.round(data.byteLength / 20); i++) {
          try {
            const json = Message.decode(
              new Uint8Array(data.slice(i * 20, i * 20 + 20))
            ).toJSON();
            for (let user of users) {
              if (user.id === json.id) {
                Object.assign(user, json);
                break;
              } else {
                continue;
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      } else {
        const json = JSON.parse(data);
        if (json["message"]) return;

        if (json["type"]) {
          if (json.type === "viewer") {
            // console.log("viewers", json);
            users.push(json);
          } else if (json.type === "player") {
            // console.log(json.id)
            Object.assign(user, json);
          }
        } else if (json instanceof Array) {
          users = json;
        }
      }
    };
    ws.onclose = (e) => {
      console.log("disconnected!");
    };
    sockets.set(i, ws);
  }
  console.log(`인원 ${sockets.size}명`);
}

function player() {
  for (let i = START; i < MAX; i++) {
    sockets.get(i).send(
      JSON.stringify({
        type: "player",
        nickname: "guest",
        pox: Math.random() * 500,
        poy: Math.random() * 500,
        roy:
          (Math.PI / 180) *
          ((i % 2 === 0 ? -1 : 1) * (i % 2 === 0 ? 180 : i % 3 === 0 ? 90 : 0)),
      })
    );
  }
  const count = Array.from(sockets.values()).reduce(
    (acc, cur) => (acc += cur.readyState === 0 ? 0 : 1),
    0
  );
  console.log(count);
}

function locations() {
  setInterval(() => {
    for (let i = START; i < MAX; i++) {
      sockets.get(i).send(
        Message.encode(
          new Message({
            id: i,
            pox: Math.random() * 500,
            poy: Math.random() * 500,
            roy:
              (Math.PI / 180) *
              ((i % 2 === 0 ? -1 : 1) *
                (i % 2 === 0 ? 180 : i % 3 === 0 ? 90 : 0)),
          })
        ).finish()
      );
    }
  }, 16);
}

function connections() {
  viewer();
  setTimeout(() => {
    player();
    setTimeout(() => {
      locations();
    }, 10000);
  }, 10000);
}

function socketPing() {
  let countConnection = 0;
  for (let socket of sockets.values()) {
    if (socket.readyState !== 0) {
      countConnection += 1;
    }
  }
  console.log("Current Connection Count:", countConnection);
}

setInterval(() => {
  socketPing();
}, 1000);

connections();
