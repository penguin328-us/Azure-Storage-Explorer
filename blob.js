var common = require('./common.js');
var azure = require('azure-storage');

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
        
        if(container){
            blobsvc.listBlobsSegmentedWithPrefix(container,directory, null, {delimiter:'/'}, function (error, result) {
                if (error) {
                    console.log(error);
                    res.status(500).send(error);
                }
                else {
                    var data = result.entries;
                    if(data && data.length){
                        for(var i=0;i<data.length;i++){
                            var index = data[i].name.lastIndexOf('/');
                            if(index >0){
                                data[i].shortName = data[i].name.substr(index+1);
                            }
                            else{
                                data[i].shortName = data[i].name;
                            }
                            
                            data[i].type = data[i].properties['content-length'] == 0 ? fileType.folder :fileType.file;
                        }
                    }
                    console.log(data);
                    res.send(data);
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
};