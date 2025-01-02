const http2 = require("http2");

const server = http2.createSecureServer();

server.on("stream", (stream, headers) => {
  const delay = headers[":path"].includes("slow") ? 2000 : 500;
  setTimeout(() => {
    stream.respond({
      "content-type": "text/plain",
      ":status": 200,
    });
    stream.end(`Response from HTTP/2 - ${headers[":path"]}\n`);
  }, delay);
});

server.listen(8080, () => {
  console.log("HTTP/2 server running at http://localhost:8080");
});
