import Message from "./src/Protobuf";
import Socket, { user, users } from "./src/Socket";

const stone = new Image();
stone.src = "assets/stone.jpg";
const man = new Image();
man.src = "assets/char.png";

const scale = (x, y, unitSize) => Math.min(x, y) * unitSize * (3 / 10);

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
let socket = new Socket();
const map = `
  11111111111
  10011001001
  11001101001
  10000000001
  10101010001
  11000011001
  10001100001
  11110100101
  10000001101
  `;
const convertedMap = createMap(map);
socket.connect();

const XSIZE = 15;
const YSIZE = XSIZE * 3;
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

form.append(nickname, btn);
wrapper.append(form);
app.append(wrapper);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  wrapper.remove();
  Object.assign(user, {
    type: "player",
    nickname: nickname.value,
    x: innerWidth / 2 - XSIZE / 2,
    y: innerHeight / 2 - YSIZE / 2,
  });
  socket.send(JSON.stringify(user));
});

function addUser(ctx, xsize, ysize, { x, y, nickname }) {
  ctx.fillText(nickname, x, y);
  ctx.textAlign = "center";
  ctx.drawImage(man, x, y, xsize, ysize);
  // ctx.beginPath();
  // ctx.arc(x, y, size, 0, 2 * Math.PI);
  // ctx.fill();
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
  for (let i = 0; i < users.length; i++) {
    addUser(ctx, XSIZE, YSIZE, users[i]);
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
  const dist = scale(x, y, Math.max(xsize, ysize));

  const xin = parseInt((user.x - xsize) / dist);
  const xout = parseInt((user.x + xsize) / dist);
  const yin = parseInt((user.y - ysize) / dist);
  const yout = parseInt((user.y + ysize) / dist);
  const xx = parseInt(user.x / dist);
  const yy = parseInt(user.y / dist);

  if (xx > xin && mapList[yy][xin]) {
    console.log("좌 충돌");
    user.x += SPEED;
  }
  if (yy > yin && mapList[yin][xx]) {
    console.log("상 충돌");
    user.y += SPEED;
  }
  if (yy < yout && mapList[yout][xx]) {
    console.log("하 충돌");
    user.y -= SPEED;
  }
  if (xx < xout && mapList[yy][xout]) {
    console.log("우 충돌");
    user.x -= SPEED;
  }

  console.log("current box", mapList[yy][xx] ? "벽" : "공간");
}

function drawMap(ctx, { mapList, size }, unitSize) {
  const { x, y } = size;
  const dist = scale(x, y, unitSize);

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

function moving() {
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
      collision(XSIZE, YSIZE);
      user.y -= SPEED;
    }
    if (joystick.a) {
      collision(XSIZE, YSIZE);
      user.x -= SPEED;
    }
    if (joystick.s) {
      collision(XSIZE, YSIZE);
      user.y += SPEED;
    }
    if (joystick.d) {
      collision(XSIZE, YSIZE);
      user.x += SPEED;
    }

    socket.send(
      Message.encode(
        new Message({ id: user.id, x: user.x, y: user.y })
      ).finish()
    );
  }
}

function animation(frame) {
  frame *= 0.001;

  render();
  drawMap(ctx, convertedMap, Math.max(XSIZE, YSIZE));
  moving();
  requestAnimationFrame(animation);
}

requestAnimationFrame(animation);
// };
