import Message from "./src/Protobuf";
import Socket, { user, users } from "./src/Socket";

window.onload = () => {
  let socket = new Socket();
  socket.connect();

  const SIZE = 15;
  const RUN = 6;
  const WALK = 3;
  let SPEED = 0;
  let x = innerWidth / 2 - SIZE;
  let y = innerHeight / 2 - SIZE;

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
      x: innerWidth - SIZE / 2,
      y: innerHeight - SIZE / 2,
    });
    socket.send(JSON.stringify(user));
  });

  function addUser(ctx, size, { x, y, nickname }) {
    ctx.fillText(nickname, x, y);
    ctx.textAlign = "center";
    ctx.beginPath();
    ctx.arc(x, y + 25, size, 0, 2 * Math.PI);
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
    for (let i = 0; i < users.length; i++) {
      addUser(ctx, SIZE, users[i]);
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
        user.y -= SPEED;
      }
      if (joystick.a) {
        user.x -= SPEED;
      }
      if (joystick.s) {
        user.y += SPEED;
      }
      if (joystick.d) {
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

    moving();
    requestAnimationFrame(animation);
  }

  requestAnimationFrame(animation);
};
