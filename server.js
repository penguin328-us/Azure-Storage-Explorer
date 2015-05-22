var http = require('http');
var table = require('./table.js');
var blob = require('./blob.js');
var port = process.env.PORT || 1337;
var ip = process.env.IP || "0.0.0.0";

var express = require('express');
var cookieParser = require('cookie-parser');
var path = require('path');
var app  = express();
var server = http.createServer(app);

app.use(express.static(path.resolve(__dirname, 'client')));
app.use(cookieParser());
table(app);
blob(app);

server.listen(port, ip , function () {
    var addr = server.address();
    console.log("Web server listening at", addr.address + ":" + addr.port);
});
