var http = require('http');
var table = require('./table.js');
var port = process.env.PORT || 1337;
var ip = process.env.IP || "0.0.0.0";

var express = require('express');
var path = require('path');
var app  = express();
var server = http.createServer(app);

app.use(express.static(path.resolve(__dirname, 'client')));
table(app);

server.listen(port, ip , function () {
    var addr = server.address();
    console.log("Web server listening at", addr.address + ":" + addr.port);
});
