angular.module('mainApp')
    .factory('blobMgmt', ['$http', function($http){
        return {
            listItem:function(sa,path){
                return $http.get('/blob/list', {
                    headers: {
                        'x-storage-account-name': sa.name,
                        'x-storage-account-key': sa.key
                    },
                    params:{path : path}
                });
            },
            newFolder:function(sa, path){
                return $http.get('/blob/newfolder', {
                    headers: {
                        'x-storage-account-name': sa.name,
                        'x-storage-account-key': sa.key
                    },
                    params:{path : path}
                });
            },
            discoverFolderForDelete:function(sa,path){
                return $http.get('/blob/discoverfolderfordelete', {
                    headers: {
                        'x-storage-account-name': sa.name,
                        'x-storage-account-key': sa.key
                    },
                    params:{path : path}
                });
            },
            deleteBlob:function(sa,path){
                return $http.get('/blob/delete', {
                    headers: {
                        'x-storage-account-name': sa.name,
                        'x-storage-account-key': sa.key
                    },
                    params:{path : path}
                });
            },
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