import protobuf from "protobufjs";
const { Message, Field } = protobuf;

Field.d(1, "fixed32", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "pox");
Field.d(3, "float", "required")(Message.prototype, "poy");

export default Message;
