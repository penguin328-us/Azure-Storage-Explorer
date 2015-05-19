var common = require('./common.js');

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
};
