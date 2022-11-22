const maria = require("mysql2");
const slave = require("mysql2");
const { dev } = require("../utils/tool");
const { masterConfig } = require("./mariadbConf");
const { slaveConfig } = require("./slaveConf");

// FIXED: const에서 let으로 변경
let mariaConnection = null;
let slaveConnection = null;

const connectionHandler = () => {
  // 재귀 함수 실행 시 변수 재정의
  mariaConnection = maria.createConnection(masterConfig);

  mariaConnection.connect((error) => {
    mariaConnection.on("error", (errorEvent) => {
      if (errorEvent.code === "PROTOCOL_CONNECTION_LOST") {
        mariaConnection.destroy();
        dev.log("DB CONNECTION RESTART!!");
        connectionHandler();
      } else {
        throw errorEvent;
      }
    });
  });

  mariaConnection.on("connect", (connection) => {
    dev.log("master handshake id →", connection.connectionId);
    dev.log("DB Connected!");
  });

  return mariaConnection;
};

const slaveConnectionHandler = () => {
  // 재귀 함수 실행 시 변수 재정의
  slaveConnection = slave.createConnection(slaveConfig);
  slaveConnection.connect((error) => {
    slaveConnection.on("error", (errorEvent) => {
      if (errorEvent.code === "PROTOCOL_CONNECTION_LOST") {
        slaveConnection.destroy();
        dev.log("Slave DB CONNECTION RESTART!!");
        connectionHandler();
      } else {
        throw errorEvent;
      }
    });
  });

  slaveConnection.on("connect", (connection) => {
    dev.log("slave handshake id →", connection.connectionId);
    dev.log("Slave DB Connected!");
  });

  return slaveConnection;
};

function keepAlive() {
  // NOTICE: mariadb.js 데이터베이스 유지 위한 ping 보내기 / 김경남 EM
  if (mariaConnection) {
    mariaConnection.ping((err) => {
      if (err) {
        dev.log("master ping!");
        if (err.fatal) {
          dev.alias("[ERROR] ::");
          dev.log("MASTER DB 연결에 문제가 발생했습니다.");
        }
        connectionHandler();
      }
    });
  }
  if (slaveConnection) {
    slaveConnection.ping((err) => {
      if (err) {
        dev.log("slave ping!");
        if (err.fatal) {
          dev.alias("[ERROR] ::");
          dev.log("SLAVE DB 연결에 문제가 발생했습니다.");
        }
        slaveConnectionHandler();
      }
    });
  }
}
setInterval(keepAlive, 10000);

mariaConnection = connectionHandler(); // NOTICE: mariadb.js 커넥션 유지 / 김경남 EM
slaveConnection = slaveConnectionHandler(); // NOTICE: mariadb.js 커넥션 유지 / 김경남 EM

module.exports = { sql: mariaConnection, slave: slaveConnection };
