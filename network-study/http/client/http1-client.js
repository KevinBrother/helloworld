const http = require("http");
const fs = require("fs");

const NUM_REQUESTS = 5;

// 测试 HTTP/1.1
console.log("\n--- Testing HTTP/1.1 ---");
for (let i = 0; i < NUM_REQUESTS; i++) {
  http.get(`http://localhost:8080/${i % 2 === 0 ? "slow" : "fast"}`, (res) => {
    res.on("data", (chunk) => {
      console.log(chunk.toString());
    });
  });
}
