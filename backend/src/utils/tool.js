Date.prototype.format = function (format) {
  const date = new Date(this);
  const hour = date.getHours();
  const isOver = hour > 12;
  return format.replace(/YYYY|MM|dd|HH|mm|ss|SSS|AP/g, ($1) => {
    switch ($1) {
      case "YYYY":
        return date.getFullYear().toString().padStart(4, 0);
      case "MM":
        return date.getMonth().toString().padStart(2, 0);
      case "dd":
        return date.getDate().toString().padStart(2, 0);
      case "HH":
        return hour.toString().padStart(2, 0);
      case "mm":
        return date.getMinutes().toString().padStart(2, 0);
      case "ss":
        return date.getSeconds().toString().padStart(2, 0);
      case "SSS":
        return date.getMilliseconds().toString().padStart(3, 0);
      case "AP":
        return isOver ? "PM" : "AM";
      default:
        return $1;
    }
  });
};

const latency = (function () {
  const labels = {};
  return {
    start(label) {
      labels[label] = performance.now();
    },
    end(label) {
      if (labels[label]) {
        console.log("%s: %d ms", label, performance.now() - labels[label]);
      }
    },
  };
})();

const dev = function () {};
dev.prototype.origin = "[DEV] ::";
dev.prototype.preffix = "[DEV] ::";
dev.alias = (alias) => (dev.prototype.preffix = alias);

Object.assign(
  dev,
  Object.fromEntries(
    Object.entries(console).map(([key, value]) => {
      const wrap = function (...arg) {
        value.call(console, dev.prototype.preffix, ...arg);
        if (dev.prototype.origin !== dev.prototype.preffix) {
          dev.prototype.preffix = dev.prototype.origin;
        }
      };
      if (key === "memory") {
        return [key, value];
      } else {
        return [key, wrap.bind(console)];
      }
    })
  )
);

module.exports.latency = latency;
module.exports.dev = dev;
