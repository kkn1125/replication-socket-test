import protobuf from "protobufjs";
const { Message, Field } = protobuf;

Field.d(1, "fixed32", "required")(Message.prototype, "id");
Field.d(2, "float", "required")(Message.prototype, "x");
Field.d(3, "float", "required")(Message.prototype, "y");

export default Message;
