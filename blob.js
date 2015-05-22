var common = require('./common.js');
var azure = require('azure-storage');
var path = require('path');
var fs = require('fs');

var fileType = {
    folder:0,
    file:1
}

module.exports = function (app) {
    app.get('/blob/list', function (req, res) {
        var blobsvc = common.getBlobService(req);
        var path = req.query.path || '/';
        var index = path.indexOf('/',1);
        var container = null;
        var directory = null;
        if(index > 0){
            container = path.substring(1,index);
            directory = path.substring(index+1);
        }
        
        var blobList = false;
        var dirList = false;
        var requestError = null;
        var data = [];
        
        function findEntry(shortName) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].shortName == shortName) {
                    return i;
                }
            }
            return -1;
        }

        if(container){
            blobsvc.listBlobsSegmentedWithPrefix(container, directory, null, { delimiter: '/' }, function (error, result) {
                if (error) {
                    requestError = error;
                }
                else {
                    var tempData = result.entries;
                    if(tempData && tempData.length){
                        for(var i=0;i< tempData.length;i++){
                            var index = tempData[i].name.lastIndexOf('/');
                            if(index >0){
                                tempData[i].shortName = tempData[i].name.substr(index+1);
                            }
                            else{
                                tempData[i].shortName = tempData[i].name;
                            }
                            tempData[i].type = tempData[i].properties['content-length'] == 0 ? fileType.folder :fileType.file;
                            
                            var index = findEntry(tempData[i].shortName);
                            if (index >= 0) {
                                data[index] = tempData[i];
                            }
                            else {
                                data.push(tempData[i]);
                            }
                        }
                    }
                }
                blobList = true;

                if (blobList && dirList) {
                    if (requestError) {
                        console.log(requestError);
                        res.status(500).send(requestError);
                    }
                    else {
                        console.log(data);
                        res.send(data);
                    }
                }
            });

            blobsvc.listBlobDirectoriesSegmentedWithPrefix(container, directory, null, { delimiter: '/' }, function (error, result) {
                if (error) {
                    requestError = error;
                }
                else {
                    var tempData = result.entries;
                    if (tempData && tempData.length) {
                        for (var i = 0; i < tempData.length; i++) {
                            var name = tempData[i].name.substr(0, tempData[i].name.length - 1);
                            var index = name.lastIndexOf('/');
                            if (index > 0) {
                                tempData[i].shortName = name.substr(index + 1);
                            }
                            else {
                                tempData[i].shortName = name;
                            }
                            tempData[i].type = fileType.folder;
                            tempData[i].properties = {};
                            var index = findEntry(tempData[i].shortName);
                            if (index < 0) {
                                data.push(tempData[i]);
                            }
                        }
                    }
                }

                dirList = true;
                if (blobList && dirList) {
                    if (requestError) {
                        console.log(requestError);
                        res.status(500).send(requestError);
                    }
                    else {
                        console.log(data);
                        res.send(data);
                    }
                }
            });
        }
        else
        {
            blobsvc.listContainersSegmented(null, function (error, result) {
                if (error) {
                    console.log(error);
                    res.status(500).send(error);
                }
                else {
                    console.log(result.entries);
                    var data = result.entries;
                    if(data && data.length){
                        for(var i=0;i<data.length;i++){
                            data[i].shortName = data[i].name;
                            data[i].type = fileType.folder;
                        }
                    }
                    res.send(data);
                }
            });
        }
    });

    app.get('/blob/file/*', function (req, res) {
        var blobPath = req.path.substr('/blob/file'.length);
        var index = blobPath.indexOf('/', 1);
        var container = null;
        var blob = null;
        if (index > 0) {
            container = blobPath.substring(1, index);
            blob = blobPath.substring(index + 1);
        }
        var filename = blob;
        index = blob.lastIndexOf('/');
        if (index > 0) {
            filename = blob.substring(index + 1);
        }
        if (container && blob && filename) {
            var dir = path.resolve(__dirname, new Date().getTime().toString());
            filename = path.resolve(dir , filename);
            console.log(filename);
            fs.mkdir(dir, function (error) {
                if (error) {
                    res.status(500).send(error);
                }
                else {
                    var blobsvc = common.getBlobService(req);
                    blobsvc.getBlobToLocalFile(container, blob, filename, function (error, serverBlob) {
                        if (error) {
                            res.status(500).send(error);
                            fs.exists(filename, function (exists) {
                                if (exists) {
                                    fs.unlink(filename, function () {
                                        fs.rmdir(dir);
                                    });
                                }
                                else {
                                    fs.rmdir(dir);
                                }
                                
                            });
                        }
                        else {
                            res.sendFile(filename, {}, function (err) {
                                fs.unlink(filename, function () { 
                                    fs.rmdir(dir);
                                });
                            });
                        }
                    });
                    
                }
            });
        } else {
            res.status(500).send("wrong blob path");
        }
    });
};