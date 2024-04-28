import http from 'http';
import path from 'path';
import fs from 'fs';

const mines = {
  img: 'image/png',
  js: 'text/javascript',
  css: 'text/css',
  html: 'text/html'
}

const server = http.createServer((req, res) => {
  if(req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/html' });
    res.end('<h1> 405 Method Not Allowed </h1>');
    return;
  }
 
  const dirName = 'static';
  const filePath = path.join(__dirname, dirName, req.url!);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      switch (err.code) {
        case 'ENOENT':
          res.statusCode = 404;
          res.end('<h1>404 Not found</h1>');
          break;
        case 'EISDIR':
          res.statusCode = 403;
          res.end('<h1>403 Forbidden</h1>');
          break
        default:
          res.statusCode = 500;
          res.end('<h1>500 Internal Server Error</h1>');
          break;
      }
      return;
    }

    const ext = path.extname(filePath).slice(1);
    const contentType = mines[ext] || 'text/plain';
    // text/html; charset=UTF-8
    res.writeHead(200, { 'Content-Type': contentType + '; charset=UTF-8'});
    res.end(data);
  })
})

server.listen(3000, () => {
    console.log('Server is running on port 3000, http://localhost:3000');
})
