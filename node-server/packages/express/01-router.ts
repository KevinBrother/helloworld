import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/:id.html', (req, res) => {
    res.send(`Hello ${req.params.id}!`);
})

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        res.send('Login success!');

    } else {
        res.status(401).send('Invalid username or password');

    }
})

app.all('*', (req, res) => {
    res.status(404).send('Not Found');
})



app.listen(3000, () => {
    console.log('Server is running on port 3000, http://localhost:3000/');
});