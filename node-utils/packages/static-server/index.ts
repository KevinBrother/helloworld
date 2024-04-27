import http from 'http';
import path from 'path';
import fs from 'fs';

const server = http.createServer((req, res) => {
  const dirName = 'static';
  const filePath = path.join(__dirname, dirName, req.url!);

  fs.readFile(filePath, (err, data) => {
    if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
    }

    res.end(data);
  })
})

server.listen(3000, () => {
    console.log('Server is running on port 3000, http://localhost:3000');
})