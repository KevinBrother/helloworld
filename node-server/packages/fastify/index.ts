import fastify from "fastify";

const app = fastify();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen({ port: 30001 }).then(() => {
  console.log("Server is running on port : http://localhost:30001");
});
