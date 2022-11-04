import WebSocket from "ws";
const sockets = new Map();
const users = [];

const AMOUNT = 100;
const START = 1;
const MAX = AMOUNT + START;

function viewer() {
  for (let i = START; i < MAX; i++) {
    const socket = new WebSocket("ws://localhost:3000");
    socket.onopen = () => {
      console.log(i, "open");
    };
    socket.onmessage = (e) => {
      console.log(e);
    };
    sockets.set(i, socket);
    users.push({
      id: i,
      type: "viewer",
    });
  }
}
function player() {
  for (let i = START; i < MAX; i++) {
    console.log("player", i);
    const socket = sockets.get(i);
    Object.assign(users[i], {
      type: "player",
      nickname: "test1",
      pox: Math.random() * 5000,
      poy: Math.random() * 5000,
    });
    socket.send(JSON.stringify(users[i]));
  }
}
function locations() {
  setInterval(() => {
    for (let i = START; i < MAX; i++) {
      const socket = sockets.get(i);
      Object.assign(users[i], {
        id: i,
        pox: Math.random() * 9000,
        poy: Math.random() * 9000,
      });
      socket.send(JSON.stringify(users[i]));
    }
  }, 16);
}
viewer();
setTimeout(() => {
  player();
  setTimeout(() => {
    locations();
  }, 5000);
}, 5000);
