const express = require('express');

const app = express()

app.use('*', (req, res) => {
    console.log('req', req)
    console.log('res', res)
    res.send('Hello World!');

})


app.listen(30001, (err) => {
    if (err) {
        console.log('err', err)
    } else {
        console.log('ser http://localhost:3000')
    }
})