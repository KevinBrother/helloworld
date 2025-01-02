const dgram = require("dgram");

const server = dgram.createSocket("udp4");

server.on("message", (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  server.send("server received", rinfo.port, rinfo.address);
});

server.bind(8080, () => {
  console.log("UDP server is running on port 8080");
});

server.on("error", (err) => {
  console.log("socket server error", err);
});
