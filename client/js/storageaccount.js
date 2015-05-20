angular.module('azureStorageMgmt', ['ngCookies'])
    .factory('accountMgmt', ['$cookies', function ($cookies) {
        var accountsKey = "AzureAccounts";
        var activeAccountKey = "ActiveAzureAccount";
        var tableContextKey = "TableContext"

        var saveToLocal = function (key, value) {
            if (typeof (Storage) !== "undefined") {
                localStorage.setItem(key, angular.toJson(value));
            } else {
                $cookie.putObject(key, value);
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
                $cookie.getObject(key);
            }
        };

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
                        return accounts[i];
                    }
                }
                saveToLocal(activeAccountKey, null);
            },

            getCurrentStorageAccount: function () {
                return loadFromLocal(activeAccountKey);
            },
            
            saveTableContext:function(ctx){
                saveToLocal(tableContextKey, ctx);
            },
            getTableContext:function(){
                return loadFromLocal(tableContextKey);
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