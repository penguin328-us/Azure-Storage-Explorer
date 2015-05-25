var http = require("http");
var fs = require("fs");

var table = require('./table.js');
var blob = require('./blob.js');
var httpsPort = 443;
var port = process.env.PORT || 80;
var ip = process.env.IP || "0.0.0.0";

var express = require('express');
var cookieParser = require('cookie-parser');
var path = require('path');
var app  = express();

var httpsOptions = null;
var server;

if(fs.existsSync('https.pfx')){
    httpsOptions = {
        pfx: fs.readFileSync('https.pfx')
    }
}
else if(fs.existsSync('https-key.pem') && fs.existsSync('https-cert.pem')){
    httpsOptions = {
        key: fs.readFileSync('https-key.pem'),
        cert: fs.readFileSync('https-cert.pem')
    }
}

app.use(express.static(path.resolve(__dirname, 'client')));
app.use(cookieParser());
table(app);
blob(app);

if(httpsOptions){
    var https = require("https");
    
    var httpsServer = https.createServer(httpsOptions,app);
    httpsServer.listen(httpsPort, ip, function(){
        var addr = server.address();
        console.log("Https server listening at", addr.address + ":" + addr.port);
    });
    
    server = http.createServer(function(req,res){
        // redirect to https
        res.writeHead(301,{
            Location: 'https://' + req.headers.host  + req.url
        });
        res.end();
    });
}
else{
    server = http.createServer(app);
}

server.listen(port, ip , function () {
    var addr = server.address();
    console.log("Web server listening at", addr.address + ":" + addr.port);
});
