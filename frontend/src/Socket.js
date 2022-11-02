export const users = [];
export const sockets = new Map();

class Socket {
  #ws = null;

  connect() {
    this.#ws = new WebSocket("ws://localhost:3000/");
    this.#ws.onopen = this.open.bind(this);
    this.#ws.onmessage = this.message.bind(this);
    this.#ws.onerror = this.error.bind(this);
    this.#ws.onclose = this.close.bind(this);
  }

  open(e) {
    console.log("connected to socket server");
    this.#ws.send("hello server");
  }
  message(message) {
    // sockets.set(socket, user);
    const { data } = message;
    
    console.log(data);
    if(data instanceof ArrayBuffer) {

    } else {
      const json = JSON.parse(data);
      
    }
  }
  error(e) {
    console.log(e);
  }
  close(e) {
    console.log(e);
  }

  send(message) {
    this.#ws.send(message);
  }
}

export default Socket;
