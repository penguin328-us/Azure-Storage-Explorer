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
    .controller('TableController', ['accountMgmt', 'tableMgmt', '$scope', '$compile', function (accountMgmt, tableMgmt, $scope, $compile) {
        $scope.currentAccount = accountMgmt.getCurrentStorageAccount();
        $scope.tableLoading = false;
        $scope.tables = [];
        $scope.currentTable = "";
        
        $scope.entitiesLoading = false;
        $scope.entities = [];
        $scope.selectedTableCols = [];
        $scope.tableQuery = "";
        
        var tableColFilterContent = "";

        function loadEntries(isTableChanged){
            $scope.entitiesLoading = true;
            tableMgmt.getEntities($scope.currentAccount, $scope.currentTable)
            .success(function (data, status) {
                $scope.entities = data;
                if (data && data.length > 0 && isTableChanged) {
                    $scope.selectedTableCols = [];
                    for (var name in data[0]) {
                        $scope.selectedTableCols.push(name);
                    }
                    initColumnFilterPopup($scope.selectedTableCols);
                    accountMgmt.saveTableContext({
                        table:$scope.currentTable,
                        cols:$scope.selectedTableCols,
                        selectedCols:$scope.selectedTableCols,
                    })
                }
            })
            .error(function (data, status) { console.log(data); })
            .finally(function () { $scope.entitiesLoading = false;});
        }
        
        function initColumnFilterPopup(cols){
            var content = '<form>';
                    for (var i = 0; i < cols.length; i++) {
                        content = content + '<div class="checkbox"><label><input ' + ($scope.selectedTableCols.indexOf(cols[i])>=0?'checked':'') + ' type="checkbox" value="' + cols[i] + '">' + cols[i] + '</label></div>';
                    }
                    content =content + '<button class="btn btn-primary" ng-click="setFilter($event)"> OK </button>  <button class="btn btn-default" onclick="$(\'#table-column-filter\').popover(\'hide\');">Cancel</button></form>';
                    tableColFilterContent = $compile(content)($scope);
                    
                    $("#table-column-filter").popover({
                        html: true,
                        content: function() {
                            return tableColFilterContent;
                        },
                        container:'#table-entries'
                    });
        }
            
        $scope.tableChange = function (){
           loadEntries(true);
        }
        
        $scope.setFilter = function($event){
            var cols = []
            $($event.target).parent().find("input:checked").each(function(){cols.push($(this).val());});
            if(cols.length>0){
                var ctx = accountMgmt.getTableContext();
                if(ctx){
                    ctx.selectedCols = cols;
                    accountMgmt.saveTableContext(ctx);
                }
                $scope.selectedTableCols = cols;
                $("#table-column-filter").popover('hide');
            }
            else{
                alert("Please Select At least on column");
            }
        }
        
        if ($scope.currentAccount && $scope.currentAccount.name) {
            $scope.tableLoading = true;
            tableMgmt.listTables($scope.currentAccount)
            .success(function (data, status) { 
                $scope.tables = data; 
                if(data && data.length>0) {
                    var ctx = accountMgmt.getTableContext();
                    $scope.currentTable = data[0];
                    applyContext(ctx);
                }})
            .error(function (data, status) { console.log(data); })
            .finally(function () { $scope.tableLoading = false; });
        }
        
        function applyContext(ctx){
            var isTableChanged = true;
            if(ctx && ctx.table){
                $scope.currentTable = ctx.table;
                if(ctx.cols && ctx.cols.length > 0){
                    isTableChanged = false;
                    if(ctx.selectedCols && ctx.selectedCols.length >0){
                        $scope.selectedTableCols = ctx.selectedCols;
                    }
                    else{
                        $scope.selectedTableCols = ctx.cols;
                    }
                    initColumnFilterPopup(ctx.cols);
                    if(ctx.query){
                        $scope.tableQuery = ctx.query;
                    }
                }
            }
            loadEntries(isTableChanged);
        }
    }])