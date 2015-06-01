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
        var blob = parseBlobPath(path);
        listBlobItems(blobsvc,blob,function(data){
            res.send(data);
        }, function(error){
            res.status(500).send(error);
        }
        );
    });
    
    app.get('/blob/newfolder', function(req,res){
        var blobsvc = common.getBlobService(req);
        var path = req.query.path || '/';
        var blob = parseBlobPath(path);
        if(blob.container){
            blobsvc.createContainerIfNotExists(blob.container, function(error, result){
                if(error){
                    res.status(500).send(error);
                }
                else{
                    listBlobItems(blobsvc,blob,function(data){
                        res.send(data);
                    }, function(err){
                        res.status(500).send(err);
                    }
                    );
                }
            })
        }
        else{
            res.status(500).send("wrong file path");
        }
    })

    app.get('/blob/file/*', function (req, res) {
        var blobPath = req.path.substr('/blob/file'.length);
        var blob = parseBlobPath(blobPath);
        var filename = blob.blob;
        var index = blob.blob.lastIndexOf('/');
        if (index > 0) {
            filename = blob.blob.substring(index + 1);
        }
        if (blob.container && blob.blob && filename) {
            var dir = path.resolve(__dirname, new Date().getTime().toString());
            filename = path.resolve(dir , filename);
            console.log(filename);
            fs.mkdir(dir, function (error) {
                if (error) {
                    res.status(500).send(error);
                }
                else {
                    var blobsvc = common.getBlobService(req);
                    blobsvc.getBlobToLocalFile(blob.container, blob.blob, filename, function (error, serverBlob) {
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

    app.post('/blob/upload', function (req, res) {
        var path = req.body.targetPath;
        var blob = parseBlobPath(path);
        if (blob.container && blob.blob) {
            if (req.files && req.files.file) {
                var blobsvc = common.getBlobService(req);
                blobsvc.createBlockBlobFromLocalFile(blob.container, blob.blob, req.files.file.path, function (error, result, response) {
                    if (error) {
                        res.status(500).send(error);
                    }
                    else {
                        res.send("success");
                    }
                    fs.unlink(req.files.file.path);
                });
            }
            else {
                res.status(500).send("cannot find file");
            }
        }
        else {
            res.status(500).send("blob path is not valid : " + path);
        }
    });
};


function parseBlobPath(path) {
    var index = path.indexOf('/', 1);
    var container = null;
    var blob = null;
    if (index > 0) {
        container = path.substring(1, index);
        blob = path.substring(index + 1);
    }
    else if (path.length > 1) {
        container = path.substring(1);
    }

    return {
        container: container,
        blob:blob
    }
}

function listBlobItems(blobsvc, blob, successCallback, errorCallback){
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

    if(blob.container){
        blobsvc.listBlobsSegmentedWithPrefix(blob.container, blob.blob, null, { delimiter: '/' }, function (error, result) {
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
                    if(errorCallback){
                        errorCallback(requestError);
                    }
                }
                else {
                    if(successCallback){
                        successCallback(data);
                    }
                }
            }
        });

        blobsvc.listBlobDirectoriesSegmentedWithPrefix(blob.container, blob.blob, null, { delimiter: '/' }, function (error, result) {
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
                    if(errorCallback){
                        errorCallback(requestError);
                    }
                }
                else {
                    if(successCallback){
                        successCallback(data);
                    }
                }
            }
        });
    }
    else
    {
        blobsvc.listContainersSegmented(null, function (error, result) {
            if (error) {
                if(errorCallback){
                    errorCallback(error);
                }
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
                if(successCallback){
                    successCallback(data);
                }
            }
        });
    }
}