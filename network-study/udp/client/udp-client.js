const dgram = require("dgram");

const client = dgram.createSocket("udp4");

client.send("client message", 8080, "localhost", (err, bytes) => {
  console.log("client sent", err, bytes);
});

client.on("message", (msg, rinfo) => {
  console.log(`client got: ${msg} from ${rinfo.address}:${rinfo.port}`);
});

client.on("error", (err) => {
  console.log("socket client error", err);
});
