import express from 'express';
import ejs from 'ejs';
import path from 'path';

const viewsPath = path.resolve(__dirname, './public'); // 获取views目录的绝对路径

const app = express();

// 设置模板引擎
app.set('view engine', 'ejs');
// 设置views目录
app.set('views', viewsPath);

app.use(express.static(viewsPath));

app.get('/', (req, res) => {

    res.render('index', { name: 'John' });

});

app.get('/other', (req, res) => {
    res.render('index', { name: 'kevin', age: 30 }); // 返回json数据
});

app.listen(3000, () => {
    console.log('Server is running on port 3000, http://localhost:3000/');
});