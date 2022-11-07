import Message from "./Protobuf";

export let user = {};
export let users = [];
export const sockets = new Map();
class Socket {
  #ws = null;

  connect() {
    this.#ws = new WebSocket("ws://localhost:3000/");
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
    // sockets.set(socket, user);
    const { data } = message;
    // console.log(data);
    if (data instanceof ArrayBuffer) {
      // console.log(data);
      const json = Message.decode(new Uint8Array(data)).toJSON();
      for (let user of users) {
        if (user.id === json.id) {
          Object.assign(user, json);
        } else {
          continue;
        }
      }
      // users = users.map((player, index) => {
      //   // 테스트 시 변경 필요
      //   // console.log(player.id, player.pox, player.poy);
      //   // console.log(json.id, json.pox, json.poy);
      //   return;
      // });
    } else {
      const json = JSON.parse(data);
      if (json["message"]) return;

      if (json["type"]) {
        if (json.type === "viewer") {
          console.log("viewers", json);
          users.push(json);
        } else if (json.type === "player") {
          // console.log("players", json);
          Object.assign(user, json);
        }
      } else if (json instanceof Array) {
        // console.log(json);
        users = json;
        // console.log('users', users)
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
