const net = require("net");

const client = net.createConnection({ port: 8080 }, () => {
  console.log("connected to server");
  client.write("client message");
});

client.on("data", (data) => {
  console.log(data.toString());
});

client.on("close", () => {
  console.log("client disconnected");
});

client.on("error", (err) => {
  console.log("socket client error", err);
});
