var http = require('http');
var port = process.env.port || 1337;
var ip = process.env.IP || "0.0.0.0";

var express = require('express');
var path = require('path');
var router = express();
var server = http.createServer(router);

router.use(express.static(path.resolve(__dirname, 'client')));


server.listen(port, ip , function () {
    var addr = server.address();
    console.log("Web server listening at", addr.address + ":" + addr.port);
});
