const express = require('express');
const app = express();
app.listen(3002, ()=> console.log('listening at 3002'))
app.use(express.static('public'))