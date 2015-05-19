var common = require('./common.js');
﻿var azure = require('azure-storage');

module.exports = function (app) {
    app.get('/table/list', function (req, res) {
        var tablesvc = common.getTableService(req);
        tablesvc.listTablesSegmented(null, function (error, result) {
            if (error) {
                console.log(error);
                res.status(500).send(error);
            }
            else {
                res.send(result.entries);
            }
        });
    });
    
    app.get('/table/listentities/:table', function(req,res){
        var tablesvc = common.getTableService(req);
        var table = req.params.table;
        var query = new azure.TableQuery();
        tablesvc.queryEntities(table,query,null, function (error, result) {
            if (error) {
                console.log(error);
                res.status(500).send(error);
            }
            else {
                console.log(result);
                res.send(result.entries);
            }
        });
    });
};
