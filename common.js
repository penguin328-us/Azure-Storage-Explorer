var azure = require('azure-storage');

exports.getTableService = function (req) {
    var sa = getStorageAccount(req);
    return azure.createTableService(sa.name, sa.key);
};

exports.getBlobService = function(req){
    var sa = getStorageAccount(req);
    return azure.createBlobService(sa.name,sa.key);
}

function getStorageAccount(req) {
    //var name = req.get('x-storage-account-name');
    //var key = req.get('x-storage-account-key')
    var name = req.cookies.accountName;
    var key = req.cookies.accountKey;

    if (name && key) {
        return {
            name: name,
            key: key,
        }
    }
    throw "no storage associated";
}