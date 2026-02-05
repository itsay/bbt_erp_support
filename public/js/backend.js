const BBTApp = angular.module('Backend', ['ngRoute', 'ngFileUpload', 'ngSanitize', 'angularjs-dropdown-multiselect']);

BBTApp.config(['$routeProvider',
    function ($routeProvider, $locationProvider) {
        $routeProvider
            .when('/welcome', {
                templateUrl: '/view/welcome.html',
                controller: 'welcomeCtrl'
            }).when('/setup/user', {
                templateUrl: '/view/setup/user-manager.html',
                controller: 'userManagerCtrl',
            })
            .otherwise({
                redirectTo: '/welcome'
            });
    }
]).factory('authHttpResponseInterceptor', ['$q', function ($q) {
    return {
        response: function (response) {
            if (response.status === 401) {
                console.log("Response 401");
            }
            return response || $q.when(response);
        },
        responseError: function (rejection) {
            if (rejection.status === 401) {
                console.log("Response Error 401", rejection);
                window.location.replace('/login.html')
            }
            return $q.reject(rejection);
        }
    }
}]).config([
    "$httpProvider",
    function ($httpProvider) {
        //Http Intercpetor to check auth failures for xhr requests
        $httpProvider.interceptors.push("authHttpResponseInterceptor");
    },
]);

BBTApp.controller("roleController", [
    "$scope",
    "$http",
    "$rootScope",
    function ($scope, $http, $rootScope) {
        $scope.data = {
            show: false,
            role: [],
            depCode: "",
        };
        $http.get("/v1/user/role").then((response) => {
            $scope.data.show = true;
        });
        $scope.showMenu = function (menu) {
            return $scope.data.role.indexOf(menu) > -1;
        };

        // Sidebar click handlers (prevents undefined function errors)
        $scope.clickDashboard = function () {
            // Intentionally left minimal; routing is handled by hash links.
        };
        $scope.clickAUS = function () {
            // Intentionally left minimal; routing is handled by hash links.
        };
    },
]);
BBTApp.controller("logoutController", [
    "$scope",
    "$http",
    "$window",
    function ($scope, $http, $window) {
        $scope.logout = function () {
            $http.get(`/v1/user/logout`).then(() => {
                $window.location.href = "/";
            });
        };
    },
]);
BBTApp.controller("welcomeCtrl", [
    "$scope",
    "$http",
    function ($scope, $http) {
        $scope.data = {
            now: new Date().toLocaleDateString(),
            quote: quotes[Math.floor(Math.random() * quotes.length)],
        };
    },
]);
