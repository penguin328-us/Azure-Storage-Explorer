angular.module('mainApp', ['ngRoute', 'ngCookies'])
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
    