angular.module('azureStorageMgmt', ['ngCookies'])
    .factory('accountMgmt', ['$cookieStore', '$cookies', function ($cookieStore, $cookies) {
        var accountsKey = "AzureAccounts";
        var activeAccountKey = "ActiveAzureAccount";
        var tableContextKey = "TableContext";
        var blobContextKey = "BlobContext";

        var saveToLocal = function (key, value) {
            if (typeof (Storage) !== "undefined") {
                localStorage.setItem(key, angular.toJson(value));
            } else {
                $cookieStore.put(key, value);
            }
        };

        var loadFromLocal = function (key) {
            if (typeof (Storage) !== "undefined") {
                var result = localStorage.getItem(key);
                if (result) {
                    return angular.fromJson(result);
                } else {
                    return null;
                }
            } else {
                $cookieStore.get(key);
            }
        };
        
        var setCurrentAccountForServer = function () {
            var account = loadFromLocal(activeAccountKey);
            if (account && account.name && account.key) {
                $cookies.accountName = account.name;
                $cookies.accountKey = account.key;
            }
            else {
                $cookieStore.remove('accountName');
                $cookieStore.remove('accountKey');
            }
        };
        
        setCurrentAccountForServer();

        return {
            addStorageAccount: function (name, key) {
                var accounts = loadFromLocal(accountsKey) || [];
                for (var i = 0; i < accounts.length; i++) {
                    if (accounts[i].name == name) {
                        accounts[i].key = key;
                        saveToLocal(accountsKey, accounts);
                        return accounts[i];
                    }
                }
                var sa = {
                    name: name,
                    key: key,
                };
                accounts.push(sa);
                saveToLocal(accountsKey, accounts);
                return sa;
            },

            removeStorageAccount: function (name) {
                var accounts = loadFromLocal(accountsKey) || [];
                for (var i = 0; i < accounts.length; i++) {
                    if (accounts[i].name == name) {
                        var sa = accounts[i];
                        accounts.splice(i, 1);
                        saveToLocal(accountsKey, accounts);
                        return sa;
                    }
                }
            },
            
            getStorageAccounts: function () {
                return loadFromLocal(accountsKey) || [];
            },

            setCurrentStorageAccount: function (name) {
                var accounts = loadFromLocal(accountsKey) || [];
                for (var i = 0; i < accounts.length; i++) {
                    if (accounts[i].name == name) {
                        saveToLocal(activeAccountKey, accounts[i]);
                        setCurrentAccountForServer();
                        return accounts[i];
                    }
                }
                saveToLocal(activeAccountKey, null);
                setCurrentAccountForServer();
            },

            getCurrentStorageAccount: function () {
                return loadFromLocal(activeAccountKey);
            },
            
            saveTableContext:function(ctx){
                saveToLocal(tableContextKey, ctx);
            },

            getTableContext:function(){
                return loadFromLocal(tableContextKey);
            },

            saveBlobContext: function (ctx) {
                saveToLocal(blobContextKey, ctx);
            },
            
            getBlobContext: function () {
                return loadFromLocal(blobContextKey);
            }
        }
    }])
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
    .factory('fileUploads', [function () {
        /* upload job object
         * url - url to take this upload
         * file - file object
         * target path - target path to save this file
         * status - 'pending' 'inProgress' 'succeed' 'failed'
         * uploadPercentage -
         * onCompleted - callback function when upload is completed
         * onProgress - callback function when  uploadPercentage get updated
        */


        var jobs = [];
        var maxJobCount = 5;
        var jobCount = 0;
        
        function runJob(job) {
            jobCount++;
            var formData = new FormData();
            formData.append('targetPath', job.target);
            formData.append('file', job.file, job.file.name);
            var xhr = new XMLHttpRequest();
            
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        job.status = 'succeed';
                    }
                    else {
                        job.status = 'failed';
                    }

                    if (job.onCompleted) {
                        job.onCompleted(job);
                    }
                    jobCount--;
                    scheduleJob();
                }
            }
            
            if (xhr.upload) {
                xhr.upload.onprogress = function (e) {
                    var done = e.position || e.loaded;
                    var total = e.totalSize || e.total;
                    job.uploadPercentage = Math.floor(done / total * 1000) / 10;
                    if (job.onProgress) {
                        job.onProgress(job);
                    }
                };
            }

            xhr.open('post', job.url, true);
            //xhr.setRequestHeader("Content-type", "multipart/form-data");
            xhr.send(formData);

            job.uploadPercentage = 0
            job.status = 'inProgress';
            if (job.onProgress) {
                job.onProgress(job);
            }
        }

        function scheduleJob() {
            if (jobs.length > 0) {
                if (jobCount < maxJobCount) {
                    var job = jobs.shift();
                    runJob(job);
                }
            }
        }


        return {
            addUploadJob: function (url, target, file) {
                var job = {
                    url: url,
                    target: target,
                    file: file,
                    status : 'pending',
                    uploadPercentage : 0
                };
                jobs.push(job);
                scheduleJob();
                return job
            },
            
            retryJob:function(job){
                job.status = 'pending';
                jobs.push(job);
                scheduleJob();
                return job;
            }
        }
    }])