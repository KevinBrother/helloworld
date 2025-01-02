const net = require("net");

const server = net.createServer((socket) => {
  console.log("client connected");
  socket.on("data", (data) => {
    console.log(data.toString());
    socket.write("server received");
  });

  socket.on("close", () => {
    console.log("client disconnected");
  });

  socket.on("end", () => {
    console.log("client end");
  });

  socket.on("error", (err) => {
    console.log("socket server error", err);
  });
});

server.listen(8080, () => {
  console.log("server is running on port 8080");
});
