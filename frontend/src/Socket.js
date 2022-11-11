import Message from "./Protobuf";

export let user = {};
export let users = [];
export const sockets = new Map();
const docker = /* "10.88.0.1" */'';
const host = docker || "localhost";
class Socket {
  #ws = null;

  connect() {
    const params = Object.fromEntries(
      location.search
        .slice(1)
        .split("&")
        .filter((q) => q)
        .map((q) => q.split("="))
    );
    this.#ws = new WebSocket(
      `ws://${host}:3000/${params.server ? "?server=" + params.server : ""}`
    );
    this.#ws.onopen = this.open.bind(this);
    this.#ws.onmessage = this.message.bind(this);
    this.#ws.onerror = this.error.bind(this);
    this.#ws.onclose = this.close.bind(this);
    this.#ws.binaryType = "arraybuffer";
  }

  open(e) {
    console.log("connected to socket server");
  }
  message(message) {
    const { data } = message;
    if (data instanceof ArrayBuffer) {
      for (let i = 0; i < Math.round(data.byteLength / 15); i++) {
        try {
          const json = Message.decode(
            new Uint8Array(data.slice(i * 15, i * 15 + 15))
          ).toJSON();
          // console.log(json)
          for (let user of users) {
            if (user.id === json.id) {
              Object.assign(user, json);
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
  }
  error(e) {
    console.log(e);
  }
  close(e) {
    console.log(e);
    this.#ws.send("close");
  }

  send(message) {
    this.#ws.send(message);
  }
}

export default Socket;
