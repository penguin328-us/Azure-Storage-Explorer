angular.module('mainApp')
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
   