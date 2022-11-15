const WebSocket = require("ws");

const protobuf = require("protobufjs");
const { Message, Field } = protobuf;

Field.d(1, "fixed32", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");

let START = 1;
let MAX = 200 + START;
const sockets = new Map();
let users = [];
let user = {};

function viewer() {
  for (let i = START; i < MAX; i++) {
    let ws = new WebSocket(`ws://192.168.254.16:3000/?server=1`);
    ws.binaryType = "arraybuffer";
    ws.onopen = (e) => {
      console.log("connected!");
    };
    ws.onmessage = (message) => {
      const { data } = message;
      if (data instanceof ArrayBuffer) {
        for (let i = 0; i < Math.round(data.byteLength / 15); i++) {
          try {
            const json = Message.decode(
              new Uint8Array(data.slice(i * 15, i * 15 + 15))
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

connections();
