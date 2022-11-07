class Queue {
  #storage = new ArrayBuffer(0);
  enter(data) {
    const temp = new Uint8Array(this.#storage.byteLength + data.byteLength);
    temp.set(new Uint8Array(this.#storage), 0);
    temp.set(new Uint8Array(data), this.#storage.byteLength);
    this.#storage = temp;
  }
  get() {
    const shift = this.#storage.slice(0, 15);
    this.#storage = this.#storage.slice(15);
    return shift;
  }
  size() {
    return this.#storage.length;
  }
}

module.exports = Queue;
