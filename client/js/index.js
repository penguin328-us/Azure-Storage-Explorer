angular.module('mainApp', ['ngRoute', 'azureStorageMgmt'])
    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {
                controller: 'AccountsController',
                templateUrl: 'account.html',
            })
            .when('/table', {
                controller: 'TableController',
                templateUrl: 'table.html'
            })
            .otherwise({
                redirectTo: '/'
            });
    })
    .controller('AccountsController', ['accountMgmt', '$scope', function (accountMgmt, $scope) {
        $scope.currentAccount = accountMgmt.getCurrentStorageAccount();
        $scope.accounts = accountMgmt.getStorageAccounts();

        $scope.newAccountName = "";
        $scope.newAccountKey = "";

        $scope.addNewAccount = function () {
            if ($scope.newAccountName && $scope.newAccountKey) {
                var sa = accountMgmt.addStorageAccount($scope.newAccountName, $scope.newAccountKey);
                $scope.accounts = accountMgmt.getStorageAccounts();
                $scope.newAccountName = "";
                $scope.newAccountKey = "";
            }
            else {
                alert("input name and key for storage account");
            }
        };

        $scope.setCurrentAccount = function (name) {
            accountMgmt.setCurrentStorageAccount(name);
            $scope.currentAccount = accountMgmt.getCurrentStorageAccount();
        };

        $scope.removeStorageAccount = function (name) {
            if (confirm("Are you sure to delete account: " + name)) {
                accountMgmt.removeStorageAccount(name);
                $scope.accounts = accountMgmt.getStorageAccounts();
                if ($scope.currentAccount && $scope.currentAccount.name == name) {
                    accountMgmt.setCurrentStorageAccount(null);
                    $scope.currentAccount = accountMgmt.getCurrentStorageAccount();
                }
            }
        }
    }])
    .controller('TableController', ['accountMgmt', 'tableMgmt', '$scope',  function (accountMgmt, tableMgmt, $scope) {
        $scope.currentAccount = accountMgmt.getCurrentStorageAccount();
        $scope.tableLoading = false;
        $scope.tables = [];
        $scope.currentTable = "";
        
        $scope.entitiesLoading = false;
        $scope.entities = [];
        $scope.tableSchema = [];
        var table = null;

        $scope.tableChange = function (){
            $scope.entitiesLoading = true;
            tableMgmt.getEntities($scope.currentAccount, $scope.currentTable)
            .success(function (data, status) {
                $scope.entities = data;
                if (data && data.length > 0 && $scope.tableSchema.length == 0) {
                    $scope.tableSchema = [];
                    for (var name in data[0]) {
                        $scope.tableSchema.push(name);
                    }
                    $("#table-column-filter").popover({
                        html: true,
                        content: function () {
                            var result = '<ul>'
                            for (var i = 0; i < $scope.tableSchema.length; i++) {
                                result = result + '<li>' + $scope.tableSchema[i] + '</li>';
                            }
                            return result + '</ul>';
                        }
                    });
                }
                //if (table) {
                //    table.destroy();
                //}
                //table = new Handsontable($("#table-entries")[0], {
                //    data: $scope.entities,
                //    colHeaders: $scope.tableSchema,
                //    manualColumnResize: true,
                //    height: 800,
                //    readOnly: true,
                //    allowInsertColumn: false,
                //    allowInsertRow: false,
                //    colWidths: 120,
                //    wordWrap: true,
                //    allowRemoveColumn: true,
                //    //contextMenu: ['remove_col', 'col_left', 'col_right']
                //});
            })
            .error(function (data, status) { console.log(data); })
            .finally(function () { $scope.entitiesLoading = false;});
        }
        
        if ($scope.currentAccount && $scope.currentAccount.name) {
            $scope.tableLoading = true;
            tableMgmt.listTables($scope.currentAccount)
            .success(function (data, status) { 
                $scope.tables = data; 
                if(data && data.length>0) {
                    $scope.currentTable = data[0];
                    $scope.tableSchema = [];
                    $scope.tableChange();
                }})
            .error(function (data, status) { console.log(data); })
            .finally(function () { $scope.tableLoading = false; });
        }
    }])