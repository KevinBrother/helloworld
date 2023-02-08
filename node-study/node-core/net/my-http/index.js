// https://github.com/a1029563229/Blogs/tree/master/Introduction/http
import http from './http.js';

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(200, JSON.stringify(req.httpMessage));
});

server.listen(8888, () => {
  console.log('server is listening in 8888...');
});
