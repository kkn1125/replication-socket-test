const maria = require("mysql2");
const slave = require("mysql2");
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
        console.log("DB CONNECTION RESTART!!");
        connectionHandler();
      } else {
        throw errorEvent;
      }
    });

    mariaConnection.on("connection", (error) => {
      console.log("is error?", error);
    });
    console.log("DB Connected!");
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
        console.log("Slave DB CONNECTION RESTART!!");
        connectionHandler();
      } else {
        throw errorEvent;
      }
    });

    console.log("Slave DB Connected!");
  });

  return slaveConnection;
};

function keepAlive() {
  // NOTICE: mariadb.js 데이터베이스 유지 위한 ping 보내기 / 김경남 EM
  if (mariaConnection) {
    mariaConnection.ping((err) => {
      if (err) {
        connectionHandler();
      }
    });
  }
  if (slaveConnection) {
    slaveConnection.ping((err) => {
      if (err) {
        slaveConnectionHandler();
      }
    });
  }
}
setInterval(keepAlive, 10000);

mariaConnection = connectionHandler(); // NOTICE: mariadb.js 커넥션 유지 / 김경남 EM
slaveConnection = slaveConnectionHandler(); // NOTICE: mariadb.js 커넥션 유지 / 김경남 EM

module.exports = { sql: mariaConnection, slave: slaveConnection };
