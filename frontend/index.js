import Message from "./src/Protobuf";
import Socket, { user, users, sockets } from "./src/Socket";

const block = new Image(); // 1
block.src = "assets/block.png";
const man = new Image(); // user
man.src = "assets/user1.png";
const ground = new Image(); // 0
ground.src = "assets/ground1.png";
const rock = new Image(); // 3
rock.src = "assets/rock3.png";
const water = new Image(); // 2
water.src = "assets/water.png";
const tree = new Image(); // 4
tree.src = "assets/tree1.png";
const bush = new Image(); // 5
bush.src = "assets/bush1.png";
// const stone3 = new Image();
// stone3.src = "assets/stone3.png";
// const stone4 = new Image();
// stone4.src = "assets/stone4.png";

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
  10011003000555500010000100
  11001103000055555010010100
  10000000050055050000000000
  10101030551000100100001000
  11000030000110100110001100
  00005500001000001000010000
  03505500001000001000010000
  00001100001000001000010000
  `;
const convertedMap = createMap(map);
let socket = new Socket();
socket.connect();

const MAPSIZE = 10;
const XSIZE = 15;
const YSIZE = XSIZE * 1;
const RUN = 4;
const WALK = 2;
let SPEED = 0;
const useMap = true;
let tempx = 0; // x 임시 값
let tempy = 0; // y 임시 값
let limit = 50; // 벽 부딪힘 제한

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

const ctx = canvas.getContext("2d");

const joystick = {
  w: false,
  a: false,
  s: false,
  d: false,
};
let clicked = false;
let targetPoint = null;
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", handleKeyUp);
window.addEventListener("resize", handleResize, false);
window.addEventListener("mousedown", handleMouseDown);
window.addEventListener("mousemove", handleMouseMove);
window.addEventListener("mouseup", handleMouseUp);
function handleMouseDown(e) {
  if (e.target.nodeName === "CANVAS") {
    e.preventDefault();
    clicked = true;
    const x = e.clientX;
    const y = e.clientY;
    targetPoint = [x, y];
  }
}
function handleMouseMove(e) {
  e.preventDefault();
  if (clicked && e.target.nodeName === "CANVAS") {
    const x = e.clientX;
    const y = e.clientY;
    targetPoint = [x, y];
  }
}
function handleMouseUp(e) {
  e.preventDefault();
  clicked = false;
}
function handleResize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}

function render() {
  for (let user of users) {
    addUser(ctx, XSIZE, YSIZE, user);
  }
}

function handleKeyDown(e) {
  joystick[e.key.toLowerCase()] = true;
}

function handleKeyUp(e) {
  if (e.type === "blur") {
    Object.keys(joystick).forEach((key) => (joystick[key] = false));
    // targetPoint = null;
  } else {
    joystick[e.key.toLowerCase()] = false;
  }
}

let direction = {
  w: -90,
  a: 180,
  s: 90,
  d: 0,
};
let currentDirection = "w";

function addUser(ctx, xsize, ysize, { pox, poy, nickname }) {
  ctx.fillText(nickname, pox, poy - 25);
  ctx.textAlign = "center";

  if (joystick.w || joystick.arrowup) {
    currentDirection = "w";
    ctx.save();
    ctx.translate(pox, poy);
    ctx.rotate((Math.PI / 180) * direction["w"]);
    ctx.translate(-pox, -poy);
    ctx.drawImage(man, pox - 20, poy - 20, xsize * 3.5, ysize * 3);
    ctx.restore();
  } else if (joystick.a || joystick.arrowleft) {
    currentDirection = "a";
    ctx.save();
    ctx.translate(pox, poy);
    ctx.rotate((Math.PI / 180) * direction["a"]);
    ctx.translate(-pox, -poy);
    ctx.drawImage(man, pox - 20, poy - 20, xsize * 3.5, ysize * 3);
    ctx.restore();
  } else if (joystick.s || joystick.arrowdown) {
    currentDirection = "s";
    ctx.save();
    ctx.translate(pox, poy);
    ctx.rotate((Math.PI / 180) * direction["s"]);
    ctx.translate(-pox, -poy);
    ctx.drawImage(man, pox - 20, poy - 20, xsize * 3.5, ysize * 3);
    ctx.restore();
  } else if (joystick.d || joystick.arrowright) {
    currentDirection = "d";
    ctx.save();
    ctx.translate(pox, poy);
    ctx.rotate((Math.PI / 180) * direction["d"]);
    ctx.translate(-pox, -poy);
    ctx.drawImage(man, pox - 20, poy - 20, xsize * 3.5, ysize * 3);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(pox, poy);
    ctx.rotate((Math.PI / 180) * direction[currentDirection]);
    ctx.translate(-pox, -poy);
    ctx.drawImage(man, pox - 20, poy - 20, xsize * 3.5, ysize * 3);
    ctx.restore();
  }

  // ctx.beginPath();
  // ctx.arc(pox, poy, ysize, 0, 2 * Math.PI);
  // ctx.fill();
  // ctx.fillRect(pox, poy, xsize, ysize);
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
      ground.width = dist / 2;
      ground.height = dist / 2;
      ctx.drawImage(ground, xl * dist, yl * dist, dist, dist);

      if (box === 1) {
        block.width = dist / 2;
        block.height = dist / 2;
        ctx.drawImage(block, xl * dist, yl * dist, dist, dist);
        // ctx.fillRect(xl * dist, yl * dist, dist, dist);
      }
      if (box === 2) {
        water.width = dist / 2;
        water.height = dist / 2;
        ctx.drawImage(water, xl * dist, yl * dist, dist, dist);
      }
      if (box === 3) {
        rock.width = dist / 2;
        rock.height = dist / 2;
        ctx.drawImage(rock, xl * dist, yl * dist - dist / 2, dist, dist);
        rock.width = dist / 2;
        rock.height = dist / 2;
        ctx.drawImage(rock, xl * dist, yl * dist, dist, dist);
      }
      if (box === 4) {
        tree.width = dist / 2;
        tree.height = dist / 2;
        ctx.drawImage(tree, xl * dist, yl * dist, dist, dist);
      }
      if (box === 5) {
        bush.width = dist / 2;
        bush.height = dist / 2;
        ctx.drawImage(bush, xl * dist, yl * dist, dist, dist);
      }
      // ctx.fillRect(xl * dist, yl * dist, dist, dist);
      // ctx.fillText(
      //   "",
      //   (xl + 1) * dist - dist / 2,
      //   (yl + 1) * dist - dist / 2
      // );
      // ctx.textAlign = "center";
    });
  });
}

function wallLimitCollision() {
  if (tempx === user.pox && tempy === user.poy) {
    limit -= 1;
    if (limit === 0) {
      limit = 50;
      console.log("stop!");
      // clicked = false; // 마우스 방향 끊고 싶을 때
      targetPoint = null;
    }
  } else {
    if (limit !== 50 || limit !== 0) {
      limit = 50;
    }
  }

  tempx = user.pox; // x 값 동일
  tempy = user.poy; // y 값 동일
}

function moving(frame) {
  if (user && user.type && user.type === "player" && targetPoint) {
    if (user.pox < targetPoint[0]) {
      useMap && collision(XSIZE, YSIZE);
      user.pox += SPEED;
    }
    if (user.pox > targetPoint[0]) {
      useMap && collision(XSIZE, YSIZE);
      user.pox -= SPEED;
    }
    if (user.poy < targetPoint[1]) {
      useMap && collision(XSIZE, YSIZE);
      user.poy += SPEED;
    }
    if (user.poy > targetPoint[1]) {
      useMap && collision(XSIZE, YSIZE);
      user.poy -= SPEED;
    }

    if (user.pox < tempx) {
      currentDirection = "a";
    } else if (user.pox > tempx) {
      currentDirection = "d";
    }
    if (user.poy < tempy) {
      currentDirection = "w";
    } else if (user.poy > tempy) {
      currentDirection = "s";
    }

    wallLimitCollision();

    if (
      targetPoint &&
      ((Math.abs(targetPoint[0] - user.pox) < 2 &&
        Math.abs(targetPoint[1] - user.poy) < 2) ||
        (Math.abs(targetPoint[0] - user.pox) < 3 &&
          Math.abs(targetPoint[1] - user.poy) < 3))
    ) {
      console.log("mouse move done!");
      // clicked = false; // 마우스 방향 끊고 싶을 때
      targetPoint = null;
    }

    socket.send(
      Message.encode(
        new Message({
          id: user.id,
          server: user.server,
          pox: user.pox,
          poy: user.poy,
        })
      ).finish()
    );
  }

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
    (joystick.w ||
      joystick.a ||
      joystick.s ||
      joystick.d ||
      joystick.arrowup ||
      joystick.arrowleft ||
      joystick.arrowdown ||
      joystick.arrowright)
  ) {
    targetPoint = null;

    if (joystick.w || joystick.arrowup) {
      useMap && collision(XSIZE, YSIZE);
      user.poy -= SPEED;
    }
    if (joystick.a || joystick.arrowleft) {
      useMap && collision(XSIZE, YSIZE);
      user.pox -= SPEED;
    }
    if (joystick.s || joystick.arrowdown) {
      useMap && collision(XSIZE, YSIZE);
      user.poy += SPEED;
    }
    if (joystick.d || joystick.arrowright) {
      useMap && collision(XSIZE, YSIZE);
      user.pox += SPEED;
    }

    wallLimitCollision();

    if (joystick.w || joystick.arrowup) {
      currentDirection = "w";
    } else if (joystick.s || joystick.arrowdown) {
      currentDirection = "s";
    }
    if (joystick.a || joystick.arrowleft) {
      currentDirection = "a";
    } else if (joystick.d || joystick.arrowright) {
      currentDirection = "d";
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

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  useMap && drawMap(ctx, convertedMap, Math.max(XSIZE, YSIZE));
  render();
  moving(frame);
  requestAnimationFrame(animation);
}

requestAnimationFrame(animation);
// };

// let START = 1;
// let MAX = 200 + START;

// function viewer() {
//   for (let i = START; i < MAX; i++) {
//     let ws = new Socket();
//     ws.connect();
//     sockets.set(i, ws);
//   }
//   console.log(`인원 ${sockets.size}명`);
// }

// function player() {
//   for (let i = START; i < MAX; i++) {
//     sockets.get(i).send(
//       JSON.stringify({
//         type: "player",
//         nickname: "guest",
//         pox: Math.random() * 500,
//         poy: Math.random() * 500,
//       })
//     );
//   }
//   const count = Array.from(sockets.values()).reduce(
//     (acc, cur) => (acc += cur.readyState === 0 ? 0 : 1),
//     0
//   );
//   console.log(count);
// }

// function locations() {
//   setInterval(() => {
//     for (let i = START; i < MAX; i++) {
//       sockets.get(i).send(
//         Message.encode(
//           new Message({
//             id: i,
//             pox: Math.random() * 500,
//             poy: Math.random() * 500,
//           })
//         ).finish()
//       );
//     }
//   }, 16);
// }

// function connections() {
//   viewer();
//   setTimeout(() => {
//     player();
//     setTimeout(() => {
//       locations();
//     }, 10000);
//   }, 10000);
// }

// connections();
