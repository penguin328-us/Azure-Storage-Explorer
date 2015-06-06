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
            .when('/blob',  {
                controller: 'BlobController',
                templateUrl:'blob.html'
            })
            .otherwise({
                redirectTo: '/'
            });
})
    .directive('fileSelected', [function () {
        return {
            restrict: 'A',
            scope: {
                callBack: '&fileSelected'
            },
            link: function (scope, elem, attr) {
                var func = attr.fileSelected
                if (func) {
                    elem.on("change", function (e) {
                        var files = e.target.files
                        scope.callBack({ files: files });
                    });
                }
            }
        }
    }])
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
        
        var count = 100;
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

        $scope.loadEntries = function (isTableChanged){
            $scope.entitiesLoading = true;
            $scope.entityCheckAll = false;
            tableMgmt.getEntities($scope.currentAccount, $scope.currentTable, count, $scope.next, $scope.tableQuery)
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
            $scope.loadEntries(true);
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
            $scope.loadEntries(false);
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
                $scope.loadEntries(false);
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
            $scope.loadEntries(false);
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
            $scope.loadEntries(isTableChanged);
        }
    }])
    .controller('BlobController', ['accountMgmt', 'blobMgmt', 'fileUploads', '$scope', '$compile', function (accountMgmt, blobMgmt, fileUploads, $scope, $compile) {
        $scope.currentAccount = accountMgmt.getCurrentStorageAccount();
        $scope.path = '/';
        $scope.pathList = [];
        $scope.items = [];
        $scope.itemsLoading = true;
        $scope.uploadingList = [];
        $scope.newFolderName = "";
        
        $scope.checkAllItems = false;
        
        function load(){
            updatePathList();
            $scope.itemsLoading = true;
            $scope.checkAllItems = false;
            accountMgmt.saveBlobContext({
                path: $scope.path
            });
            blobMgmt.listItem($scope.currentAccount, $scope.path)
            .success(function (data, status) { 
                $scope.items = data; 
            })
            .error(function (data, status) { console.log(data); })
            .finally(function () { $scope.itemsLoading = false; });
        }
        
        function updatePathList(){
            var list = $scope.path.split('/');
            var path = "/";
            $scope.pathList = [];
            for(var i=0;i<list.length;i++){
                if(list[i]){
                    path = path + list[i] + '/';
                    $scope.pathList.push({
                        name:list[i],
                        path:path
                    })
                }
            }
        }
        
        function applyContext() {
            var ctx = accountMgmt.getBlobContext();
            if (ctx && ctx.path) {
                $scope.path = ctx.path;
            }
            load();
        }

        if ($scope.currentAccount && $scope.currentAccount.name) {
            applyContext();
        }

        $scope.openItem = function(item){
            if(item.type == 0){
                $scope.path = $scope.path + item.shortName + '/';
                load();
            }
            else{
                window.open('/blob/file' + $scope.path + item.shortName )
            }
        }
        
        $scope.openFolder = function(path){
            $scope.path = path;
            load();
        }
        
        $scope.getSize = function (item) {
            if (item.type == 1) {
                return (item.properties['content-length']/1024).toFixed(2) + ' KB'
            }
            return "";
        },

        $scope.getIcon = function (item) {
            if (item.type == 0) {
                return '/image/fileIcons/folder.png';
            }
            else {
                var extension = '';
                var index = item.shortName.lastIndexOf('.');
                if (index > 0) {
                    extension = item.shortName.substr(index + 1);
                }
                switch (extension.toLowerCase()) {
                    case "xml":
                        return '/image/fileIcons/xml.jpg';
                    case "json":
                        return '/image/fileIcons/json.jpg';
                    case "txt":
                    case "log":
                        return '/image/fileIcons/txt.jpg';
                    case "png":
                    case "jpg":
                    case "bmp":
                        return '/image/fileIcons/image.png'
                    default:
                        return '/image/fileIcons/file.png';
                }
            }
        }
        
        function isItemExists(name) {
            for (var i = 0; i < $scope.items.length; i++) {
                if ($scope.items[i].shortName.toLowerCase() === name.toLowerCase()) {
                    return true;
                }
            }
            return false;
        }
        
        function uploadFile(file) {
            var job = fileUploads.addUploadJob('/blob/upload', $scope.path + file.name, file);
            
            job.onProgress = function () { 
                $scope.$apply();
            }
            job.onCompleted = function () {
                if(job.status === 'succeed')
                {
                    var index = $scope.uploadingList.indexOf(job);
                    if(index >=0 ){
                        $scope.uploadingList.splice(index,1);
                        $scope.items.unshift(job);
                    }
                }
                if(job.path === $scope.path)
                {
                    $scope.$apply();
                }
            }
            
            job.shortName = file.name;
            job.properties = {};
            job.properties['content-length'] = file.size;
            job.properties['last-modified'] = 'N/A';
            job.type = 1;
            job.path = $scope.path;
            $scope.uploadingList.push(job);
        }

        $scope.fileSelected = function (files) {
            for (var i = 0; i < files.length; i++) {
                if (isItemExists(files[i].name)) {
                    if (confirm(files[i].name + " already exists, do you want to override this item")) {
                        uploadFile(files[i]);
                    }
                }
                else {
                    uploadFile(files[i]);
                }
            }
        }
        
        $scope.retryUpload = function(upload){
            fileUploads.retryJob(upload);
        }
        
        $scope.cancelUpload = function(upload){
            var index = $scope.uploadingList.indexOf(upload);
            if(index >= 0){
                $scope.uploadingList.splice(index,1);
            }
        }
        
        $scope.newFolder = function(){
            if($scope.newFolderName){
                var oldPath = $scope.path;
                $scope.path = $scope.path + $scope.newFolderName + '/';
                $scope.newFolderName = '';
                
                updatePathList();
                $scope.itemsLoading = true;
                accountMgmt.saveBlobContext({
                    path: $scope.path
                });
                blobMgmt.newFolder($scope.currentAccount, $scope.path)
                .success(function (data, status) { 
                    $scope.items = data; 
                })
                .error(function (data, status) { 
                    console.log(data); 
                    $scope.path = oldPath;
                    updatePathList();
                })
                .finally(function () { $scope.itemsLoading = false; });
            }
        }
        
        $scope.clickCheckAllItems = function(){
            for(var i=0;i<$scope.items.length;i++){
                $scope.items[i].$selected = $scope.checkAllItems;
            }
        }
        
        $scope.hasAnyItemChecked = function(){
            for(var i=0;i<$scope.items.length;i++){
                if($scope.items[i].$selected){
                    return true;
                }
            }
            return false;
        }
        
        var toBeDeletedBlobs = [];
        var toBeDeletedFolders = [];
        
        var totalToBeDeletedFolders = 0;
        var totalToBeDeletedBlobs = 0;
        
        $scope.deleteAction = "discovery folder";
        $scope.deleteActionPath = "/"
        $scope.deleteError = "";
        $scope.deletePercentage = 0.0;
        
        $scope.deleteBlobs = function(){
            toBeDeletedBlobs = [];
            toBeDeletedFolders = [];
            $scope.deleteAction = "discovery folder";
            $scope.deletePercentage = 0.0;
            for(var i=0;i<$scope.items.length;i++){
                if($scope.items[i].$selected){
                    var path = $scope.path + $scope.items[i].shortName;
                    if($scope.items[i].type == 0){
                        toBeDeletedFolders.push(path);
                    }
                    else{
                        toBeDeletedBlobs.push(path);
                    }
                }
            }
            
            totalToBeDeletedBlobs = toBeDeletedBlobs.length;
            totalToBeDeletedFolders = toBeDeletedFolders.length;
            
            if(totalToBeDeletedBlobs + totalToBeDeletedFolders > 0){
                if(confirm("are you sure to delete those items?")){
                    $scope.continueDeleting();
                    $('#divDeletingDlg').modal('show');
                }
            }else{
                alert("Please Select at least one item for deleting");
            }
        };
        
        $scope.continueDeleting = function(){
            if($scope.deleteAction == "discovery folder"){
                if(toBeDeletedFolders.length == 0){
                    $scope.deleteAction = "delete blob";
                    totalToBeDeletedBlobs = toBeDeletedBlobs.length;
                    $scope.continueDeleting();
                }
                else{
                    $scope.deletePercentage = Math.floor((totalToBeDeletedFolders - toBeDeletedFolders.length) / totalToBeDeletedFolders * 1000) / 10;
                    $scope.deleteActionPath = toBeDeletedFolders.shift();
                    $scope.deletingCurrentItem();
                }
            }else{
                if(toBeDeletedBlobs.length > 0){
                    $scope.deletePercentage = Math.floor((totalToBeDeletedBlobs - toBeDeletedBlobs.length) / totalToBeDeletedBlobs * 1000) / 10;
                    $scope.deleteActionPath = toBeDeletedBlobs.shift();
                    $scope.deletingCurrentItem();
                }
                else{
                    $scope.cancelDeleting();
                }
            }
        }
        
        $scope.deletingCurrentItem = function(){
            if($scope.deleteAction == "discovery folder"){
                blobMgmt.discoverFolderForDelete($scope.currentAccount, $scope.deleteActionPath)
                .success(function(result){
                    if(result && result.blobs && result.blobs.length > 0){
                        for(var i=0; i< result.blobs.length;i++){
                            toBeDeletedBlobs.push(result.blobs[i]);
                        }
                    }
                    $scope.continueDeleting();
                })
                .error(function(error){$scope.deleteError = error;})
            }
            else{
                blobMgmt.deleteBlob($scope.currentAccount, $scope.deleteActionPath)
                .success(function(result){
                    $scope.continueDeleting();
                })
                .error(function(error){$scope.deleteError = error;})
            }
            
        }
        
        $scope.cancelDeleting = function(){
            load();
            $('#divDeletingDlg').modal('hide');
        }
        
    }])