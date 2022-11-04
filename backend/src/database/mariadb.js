const maria = require("mysql");
const dbConfig = require("./mariadbConf");

// FIXED: const에서 let으로 변경
let mariaConnection = null;

const connectionHandler = () => {
  // 재귀 함수 실행 시 변수 재정의
  mariaConnection = maria.createConnection(dbConfig);

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
    
    console.log("DB Connected!")
  });

  return mariaConnection;
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
}
setInterval(keepAlive, 10000);

mariaConnection = connectionHandler(); // NOTICE: mariadb.js 커넥션 유지 / 김경남 EM

module.exports = { sql: mariaConnection };
