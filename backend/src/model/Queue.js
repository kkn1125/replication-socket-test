class Queue {
  #storage = new ArrayBuffer(0);
  enter(data) {
    const temp = new Uint8Array(this.#storage.byteLength + data.byteLength);
    temp.set(new Uint8Array(this.#storage), 0);
    temp.set(new Uint8Array(data), this.#storage.byteLength);
    this.#storage = temp;
  }
  get() {
    const shift = this.#storage;
    this.#storage = new ArrayBuffer(0);
    return shift;
  }
  size() {
    return this.#storage.length;
  }
}

class DataQueue {
  #store = [];
  enter(data) {
    this.#store.push(data);
  }
  get() {
    return this.#store.shift();
  }
  size() {
    return this.#store.length;
  }
}

module.exports = Queue;
module.exports.DataQueue = DataQueue;
