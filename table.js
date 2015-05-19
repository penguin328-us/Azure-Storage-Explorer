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
                console.log(result.entries);
                var entries = [];
                if (result.entries) {
                    for (var i = 0; i < result.entries.length; i++) {
                        var entry = {};
                        for (var name in result.entries[i]) {
                            entry[name] = result.entries[i][name]._;
                        }
                        entries.push(entry);
                    }
                }
                res.send(entries);
            }
        });
    });
};
