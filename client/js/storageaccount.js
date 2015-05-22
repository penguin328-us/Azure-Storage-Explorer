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
        function callTableService(sa, url){
            return $http.get(url, {
                headers: {
                    'x-storage-account-name': sa.name,
                    'x-storage-account-key': sa.key
                }
            });
        }
        return {
            listTables:function(sa){
                return callTableService(sa,'/table/list');
            },
            
            getEntities:function(sa,table){
                return callTableService(sa,'/table/listentities/' + table);
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
            }
        }
    }])