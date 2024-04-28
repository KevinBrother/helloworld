import express from 'express';

const app = express();

app.get('/other', (req, res) => {
    // res.status(200).send('Hello from other route');
    // res.redirect('https://baidu.com');
    // res.sendFile(__dirname + '/package.json'); // 发送文件 会根据文件自动设置Content-Type
    // res.download(__dirname + '/package.json', 'rename.json'); // 下载文件
    res.json({ name: 'John', age: 30 }); // 返回json数据
});

app.listen(3000, () => {
    console.log('Server is running on port 3000, http://localhost:3000/');
});