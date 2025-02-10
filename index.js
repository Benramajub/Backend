const express = require('express')
const app = express()
const PORT = 4000

app.listen(PORT, () => {
    console.log('API Listening on PORT ${PORT}')
})

app.get('/' ,(res, req) => {
    res.send('This is my API running...')
})

app.get('/about' ,(res, req) => {
    res.send('This is my API running...')
})

module.exports = app