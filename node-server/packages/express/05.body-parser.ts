import express from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';

const app = express();

// 解析 json 请求体的中间件
const jsonParser = bodyParser.json()

// 解析 queryString 格式请求体的中间件
const urlencodedParser = bodyParser.urlencoded({ extended: false })

app.get('/login', (req, res) => {

    const loginPage = fs.readFileSync('./public/login.html', 'utf-8');
    res.send(loginPage);
});

app.post('/login', urlencodedParser, (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '123456') {
    res.send('Login success!');
  } else {
    res.status(401).send('Invalid username or password!');
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});