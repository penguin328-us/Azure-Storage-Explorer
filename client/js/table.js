angular.module('mainApp')
    .factory('tableMgmt', ['$http', function($http){
        function callTableService(sa, url, params){
            return $http.get(url, {
                headers: {
                    'x-storage-account-name': sa.name,
                    'x-storage-account-key': sa.key
                },
                params: params
            });
        }
        return {
            listTables:function(sa){
                return callTableService(sa,'/table/list');
            },
            
            getEntities:function(sa,table, count, next, query){
                return callTableService(sa, '/table/listentities/' + table, {
                    count: count,
                    query: query,
                    next: next
                });
            },
            deleteEntity:function(sa, table, entity){
                return callTableService(sa, '/table/deleteEntity/' + table, {
                    PartitionKey: entity.PartitionKey,
                    RowKey:entity.RowKey,
                });
            }
        }
    }])
    .controller('TableController', ['accountMgmt', 'tableMgmt', '$scope', '$compile', function (accountMgmt, tableMgmt, $scope, $compile) {
        $scope.currentAccount = accountMgmt.getCurrentStorageAccount();
        $scope.tableLoading = false;
        $scope.tables = [];
        $scope.currentTable = "";
        
        var tableSettings = accountMgmt.getTableSettings() || {displayCount:100};
        $scope.entitiesLoading = false;
        $scope.next = null
        $scope.entities = [];
        $scope.selectedTableCols = [];
        $scope.tableCols = [];
        $scope.tableQuery = "";
        $scope.entityCheckAll = false;
        $scope.colsCheckAll = false;
        
        $scope.deletingEntity = {};
        $scope.deletingError = "";
        $scope.deletingPercentage = 0.0;
        
        var toBeDeletedEntities = [];
        var toBeDeletedEntitiesCount = 0;
        
        var tableColFilterContent = "";

        $scope.loadEntities = function (isTableChanged){
            $scope.entitiesLoading = true;
            $scope.entityCheckAll = false;
            tableMgmt.getEntities($scope.currentAccount, $scope.currentTable, tableSettings.displayCount, $scope.next, $scope.tableQuery)
            .success(function (data, status) {
                $scope.next = data.next;
                $scope.entities = data.entries;
                if (data.entries && data.entries.length > 0 && isTableChanged) {
                    $scope.selectedTableCols = [];
                    $scope.tableCols = [];
                    for (var name in data.entries[0]) {
                        $scope.selectedTableCols.push(name);
                        $scope.tableCols.push({
                            name:name,
                            selected:true
                        })
                    }
                    $scope.colsCheckAll = true;
                    accountMgmt.saveTableContext({
                        table:$scope.currentTable,
                        tableCols:$scope.tableCols,
                        query: $scope.tableQuery
                    })
                }
            })
            .error(function (data, status) { console.log(data); })
            .finally(function () { $scope.entitiesLoading = false;});
        }
        
        function initColumnFilterPopup(cols){
            var content = '<div class="checkbox"><label><input type="checkbox" ng-click="checkAllCols()" ng-model="colsCheckAll"/>#Check All</label></div><form>';

            content = content + '<div class="checkbox" ng-repeat="col in tableCols"><label><input ng-model="col.selected" type="checkbox" value="{{col.name}}">{{col.name}}</label></div>';
            content = content + '<button class="btn btn-primary" ng-click="setFilter($event)"> OK </button>  <button class="btn btn-default" onclick="$(\'#table-column-filter\').popover(\'hide\');">Cancel</button></form>';
            tableColFilterContent = $compile(content)($scope);
                    
            $("#table-column-filter").popover({
                html: true,
                content:  tableColFilterContent,
                container:'#table-entries'
            });
        }
            
        $scope.tableChange = function (){
            $scope.next = null;
            $scope.loadEntities(true);
        }
        
        $scope.checkAllCols = function(){
            for(var i=0;i<$scope.tableCols.length;i++){
                $scope.tableCols[i].selected = $scope.colsCheckAll;
            }
        }
        
        $scope.setFilter = function(){
            var cols = [];
            for(var i=0;i<$scope.tableCols.length;i++){
                if($scope.tableCols[i].selected){
                    cols.push($scope.tableCols[i].name);
                }
            }
            if(cols.length>0){
                var ctx = accountMgmt.getTableContext();
                if(ctx){
                    ctx.tableCols = $scope.tableCols;
                    accountMgmt.saveTableContext(ctx);
                }
                $scope.selectedTableCols = cols;
                $("#table-column-filter").popover('hide');
            }
            else{
                alert("Please Select At least on column");
            }
        }
        
        $scope.search = function () {
            $scope.next = null;
            var ctx = accountMgmt.getTableContext();
            if (ctx) {
                ctx.query = $scope.tableQuery;
                accountMgmt.saveTableContext(ctx);
            }
            $scope.loadEntities(false);
        }

        $scope.checkAllEntities = function(){
            for(var i=0; i < $scope.entities.length;i++){
                $scope.entities[i].$selected = $scope.entityCheckAll
            }
        }
        
        $scope.hasAnyEntryChecked = function(){
            for(var i=0;i<$scope.entities.length;i++){
                if($scope.entities[i].$selected){
                    return true;
                }
            }
            return false;
        }
        
        $scope.deleteEntries = function(){
            toBeDeletedEntities = [];
            $scope.deletingError = "";
            for(var i=0;i<$scope.entities.length;i++){
                if($scope.entities[i].$selected){
                    toBeDeletedEntities.push($scope.entities[i]);
                }
            }
            toBeDeletedEntitiesCount = toBeDeletedEntities.length;
            if(toBeDeletedEntitiesCount > 0)
            {
                if(confirm("Are you sure to delete those entities?")){
                    $scope.continueDeleting();
                    $("#divDeletingDlg").modal('show');
                }
            }
            else{
                alert("Please Select at least one entity");
            }
        }
        
        
        $scope.continueDeleting = function(){
            $scope.deletingPercentage = Math.floor((toBeDeletedEntitiesCount - toBeDeletedEntities.length) / toBeDeletedEntitiesCount * 1000) / 10;
            if(toBeDeletedEntities.length > 0){
                $scope.deletingEntity = toBeDeletedEntities.shift();
                $scope.deletingCurrentEntity();
            }
            else{
                $("#divDeletingDlg").modal('hide');
                $scope.next = null;
                $scope.loadEntities(false);
            }
        }
        
        $scope.deletingCurrentEntity = function(){
            $scope.deletingError = "";
            tableMgmt.deleteEntity($scope.currentAccount, $scope.currentTable, $scope.deletingEntity)
            .success(function(data){ $scope.continueDeleting(); })
            .error(function(error){$scope.deletingError = error;})
        }
        
        $scope.cancelDeleting = function(){
            $("#divDeletingDlg").modal('hide');
            $scope.loadEntities(false);
        }

        if ($scope.currentAccount && $scope.currentAccount.name) {
            $scope.tableLoading = true;
            tableMgmt.listTables($scope.currentAccount)
            .success(function (data, status) { 
                $scope.tables = data; 
                if(data && data.length>0) {
                    var ctx = accountMgmt.getTableContext();
                    $scope.currentTable = data[0];
                    initColumnFilterPopup();
                    applyContext(ctx);
                }})
            .error(function (data, status) { console.log(data); })
            .finally(function () { $scope.tableLoading = false; });
        }
        
        function applyContext(ctx){
            var isTableChanged = true;
            if(ctx && ctx.table){
                $scope.currentTable = ctx.table;
                if(ctx.tableCols && ctx.tableCols.length > 0){
                    isTableChanged = false;
                    $scope.tableCols = ctx.tableCols;
                    for(var i=0;i<$scope.tableCols.length;i++){
                        if($scope.tableCols[i].selected){
                            $scope.selectedTableCols.push($scope.tableCols[i].name);
                        }
                    }
                    if(ctx.query){
                        $scope.tableQuery = ctx.query;
                    }
                }
            }
            $scope.loadEntities(isTableChanged);
        }
    }]);