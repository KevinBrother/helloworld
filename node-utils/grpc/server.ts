const PROTO_PATH = __dirname + "/helloworld.proto";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const hello_proto = grpc.loadPackageDefinition(packageDefinition);

/**
 * Implements the SayHello RPC method.
 */
function sayHello(call, callback) {
  callback(null, { message: "Hello " + call.request.name });
}

/**
 * Starts an RPC server that receives requests for the Greeter service at the
 * sample server port
 */
function main() {
  const server = new grpc.Server();
  // @ts-ignore
  server.addService(hello_proto.Greeter.service, {
    sayHello: sayHello,
    // 新招呼
    // sayHelloAgain: sayHelloAgain,
  });
  server.bindAsync(
    "0.0.0.0:50051",
    // '127.0.0.1:8080',
    grpc.ServerCredentials.createInsecure(),
    () => {
      server.start();
    }
  );
}

main();