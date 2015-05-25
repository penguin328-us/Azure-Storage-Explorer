
var fs = require("fs");

var table = require('./table.js');
var blob = require('./blob.js');
var port = process.env.PORT || 80;
var ip = process.env.IP || "0.0.0.0";

var express = require('express');
var cookieParser = require('cookie-parser');
var path = require('path');
var app  = express();
var server;

if(fs.existsSync('https.pfx')){
    port = process.env.PORT || 443;
    var https = require("https");
    var option = {
        pfx: fs.readFileSync('https.pfx')
    }
    
    server = https.createServer(option,app);
}
else if(fs.existsSync('https-key.pem') && fs.existsSync('https-cert.pem')){
     port = process.env.PORT || 443;
    var https = require("https");
    var option = {
        key: fs.readFileSync('https-key.pem'),
        cert: fs.readFileSync('https-cert.pem')
    }
    
    server = https.createServer(option,app);
}
else{
    var http = require('http');
    server = http.createServer(app);
}

 

app.use(express.static(path.resolve(__dirname, 'client')));
app.use(cookieParser());
table(app);
blob(app);

server.listen(port, ip , function () {
    var addr = server.address();
    console.log("Web server listening at", addr.address + ":" + addr.port);
});
