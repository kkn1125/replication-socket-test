import Message from "./src/Protobuf";
import Socket, { user, users, sockets } from "./src/Socket";

const stone = new Image();
stone.src = "assets/stone.jpg";
const man = new Image();
man.src = "assets/char.png";

const scale = (x, y) => Math.min(x, y);

function createMap(map) {
  const converted = map
    .trim()
    .split(/\n/g)
    .map((row) =>
      row
        .trim()
        .split("")
        .map((box) => Number(box))
    );
  return {
    mapList: converted,
    size: {
      x: converted[0].length,
      y: converted.length,
    },
  };
}

// window.onload = () => {
const map = `
  11111111111001001111111111
  10011001000001100010000100
  11001101001001001010010100
  10000000000100000000000000
  10101010001110100100001000
  11000011000010100110001100
  00001100001000001000010000
  00001100001000001000010000
  `;
const convertedMap = createMap(map);
let socket = new Socket();
socket.connect();

const MAPSIZE = 10;
const XSIZE = 15;
const YSIZE = XSIZE * 1;
const RUN = 6;
const WALK = 3;
let SPEED = 0;

const app = document.querySelector("#app");

const canvas = document.createElement("canvas");
canvas.id = "canvas";
canvas.width = innerWidth;
canvas.height = innerHeight;

app.append(canvas);

const wrapper = document.createElement("div");
wrapper.id = "wrapper";

const form = document.createElement("form");
form.id = "form";

const nickname = document.createElement("input");
nickname.id = "nickname";
nickname.type = "text";

const btn = document.createElement("button");
btn.classList.add("btn");
btn.innerText = "Login";
btn.type = "submit";

const btn2 = document.createElement("button");
btn2.classList.add("btn");
btn2.innerText = "Guest";
btn2.type = "button";

form.append(nickname, btn, btn2);
wrapper.append(form);
app.append(wrapper);

btn2.addEventListener("click", (e) => {
  e.preventDefault();
  wrapper.remove();
  Object.assign(user, {
    type: "player",
    nickname: "guest",
    pox: innerWidth / 2 - XSIZE / 2,
    poy: innerHeight / 2 - YSIZE / 2,
  });
  socket.send(JSON.stringify(user));
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  wrapper.remove();
  Object.assign(user, {
    type: "player",
    nickname: nickname.value,
    pox: innerWidth / 2 - XSIZE / 2,
    poy: innerHeight / 2 - YSIZE / 2,
  });
  socket.send(JSON.stringify(user));
});

function addUser(ctx, xsize, ysize, { pox, poy, nickname }) {
  ctx.fillText(nickname, pox, poy - 25);
  ctx.textAlign = "center";
  // ctx.drawImage(man, x, y, xsize, ysize);
  ctx.beginPath();
  ctx.arc(pox, poy, ysize, 0, 2 * Math.PI);
  ctx.fill();
}

const ctx = canvas.getContext("2d");

const joystick = {
  w: false,
  a: false,
  s: false,
  d: false,
};
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", handleKeyUp);
window.addEventListener("resize", handleResize, false);
function handleResize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // console.log(users)
  for (let user of users.values()) {
    addUser(ctx, XSIZE, YSIZE, user);
  }
}

function handleKeyDown(e) {
  joystick[e.key.toLowerCase()] = true;
}

function handleKeyUp(e) {
  if (e.type === "blur") {
    Object.keys(joystick).forEach((key) => (joystick[key] = false));
  } else {
    joystick[e.key.toLowerCase()] = false;
  }
}

function collision(xsize, ysize) {
  const { mapList, size } = convertedMap;
  const { x, y } = size;
  const dist = scale(x, y) * MAPSIZE;

  const xin = parseInt((user.pox - xsize) / dist);
  const xout = parseInt((user.pox + xsize) / dist);
  const yin = parseInt((user.poy - ysize) / dist);
  const yout = parseInt((user.poy + ysize) / dist);
  const xx = parseInt(user.pox / dist);
  const yy = parseInt(user.poy / dist);
  if (Math.max(yy, yout, yin) > mapList.length - 1) {
    user.poy -= SPEED;
  } else if (Math.max(xx, xout, xin) > mapList[0].length - 1) {
    user.pox -= SPEED;
  } else if (user.poy - ysize < 0) {
    user.poy += SPEED;
  } else if (user.pox - xsize < 0) {
    user.pox += SPEED;
  } else {
    if (xx > xin && mapList[yy][xin]) {
      // console.log("좌 충돌");
      user.pox += SPEED;
    }
    if (yy > yin && mapList[yin][xx]) {
      // console.log("상 충돌");
      user.poy += SPEED;
    }

    if (yy < yout && mapList[yout][xx]) {
      // console.log("하 충돌");
      user.poy -= SPEED;
    }
    if (xx < xout && mapList[yy][xout]) {
      // console.log("우 충돌");
      user.pox -= SPEED;
    }

    // console.log("current box", mapList?.[yy]?.[xx] ? "벽" : "공간");
  }
}

function drawMap(ctx, { mapList, size }, unitSize) {
  const { x, y } = size;
  const dist = scale(x, y) * MAPSIZE;

  mapList.forEach((row, yl) => {
    row.forEach((box, xl) => {
      if (Boolean(box)) {
        stone.width = dist / 2;
        stone.height = dist / 2;
        ctx.drawImage(stone, xl * dist, yl * dist, dist, dist);
        // ctx.fillRect(xl * dist, yl * dist, dist, dist);
      } else {
        ctx.fillText(
          "empty",
          (xl + 1) * dist - dist / 2,
          (yl + 1) * dist - dist / 2
        );
        ctx.textAlign = "center";
      }
    });
  });
}

function moving(frame) {
  if (joystick.shift) {
    SPEED = RUN;
  } else {
    SPEED = WALK;
  }
  // move values
  if (
    user &&
    user.type &&
    user.type === "player" &&
    (joystick.w || joystick.a || joystick.s || joystick.d)
  ) {
    if (joystick.w) {
      // collision(XSIZE, YSIZE);
      user.poy -= SPEED;
    }
    if (joystick.a) {
      // collision(XSIZE, YSIZE);
      user.pox -= SPEED;
    }
    if (joystick.s) {
      // collision(XSIZE, YSIZE);
      user.poy += SPEED;
    }
    if (joystick.d) {
      // collision(XSIZE, YSIZE);
      user.pox += SPEED;
    }

    socket.send(
      Message.encode(
        new Message({ id: user.id, pox: user.pox, poy: user.poy })
      ).finish()
    );
  }
}

function animation(frame) {
  frame *= 0.001;

  render();
  // drawMap(ctx, convertedMap, Math.max(XSIZE, YSIZE));
  moving(frame);
  requestAnimationFrame(animation);
}

requestAnimationFrame(animation);
// };

let START = 1;
let MAX = 50 + START;

function viewer() {
  for (let i = START; i < MAX; i++) {
    let ws = new Socket();
    ws.connect();
    sockets.set(i, ws);
  }
}

function player() {
  for (let i = START; i < MAX; i++) {
    sockets.get(i).send(
      JSON.stringify({
        type: "player",
        nickname: "test" + i,
        pox: Math.random() * 500,
        poy: Math.random() * 500,
      })
    );
  }
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

// viewer();
// setTimeout(() => {
//   player();
//   setTimeout(() => {
//     locations();
//   }, 10000);
// }, 10000);
