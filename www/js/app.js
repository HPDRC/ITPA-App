"use strict";

var starter = angular.module('starter', ['ionic', 'ngCordova', 'ngResource', 'toastr', 'starter.controllers', 'starter.services']);

starter.controllers = angular.module('starter.controllers', ['toastr']);
starter.services = angular.module('starter.services', ['ngResource']);

starter.run(function ($ionicPlatform) {
    $ionicPlatform.ready(function ($cordovaDevice) {
        if (cordova.platformId === 'ios' && window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
            //cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            cordova.plugins.Keyboard.disableScroll(true);
        }
        var device = ionic.Platform.device();
        ITPACore.SetDeviceUUID(device.uuid);
        //console.log(device.uuid);
        if (window.StatusBar) { StatusBar.styleDefault(); }
        //if (window.cordova) { ITPACore.SetCordovaDevice($cordovaDevice); }
        ITPACore.isIOS = !!ionic.Platform.isIOS();

        document.addEventListener('backbutton', (event) => {
            event.preventDefault();
            console.log('back button');
        }, false);

        try {
            //var debugParkingDetectorPlugIn = true;
            //var debugParkingDetectorPlugIn = false;
            /*if (initParkingDetectorPlugin != undefined) {
                initParkingDetectorPlugin(debugParkingDetectorPlugIn, 2, "http://streetsmartdemo.cloudapp.net/newParkingActivity");
            }*/
        }
        catch(e){}
    });
});

starter.config(['$stateProvider', '$urlRouterProvider', '$compileProvider',
function ($stateProvider, $urlRouterProvider, $compileProvider) {

    $compileProvider.debugInfoEnabled(true);

    $stateProvider

    .state('login', {
        url: '/login',
        templateUrl: 'templates/login.html',
        controller: 'LoginCtrl'
    })
    .state('app', {
        name: "app",
        url: '',
        abstract: true,
        templateUrl: 'templates/home.html',
        controller: 'HomeCtrl',
    })
    .state('app.home', {
        url: '/',
        views: {
            "mapViewContent": {
                templateUrl: 'templates/views/mapview.html',
                controller: 'MapViewCtrl'
            },
            "listViewContent": {
                templateUrl: 'templates/views/listview.html',
                controller: 'ListViewCtrl'
            }
        }
    });
    $urlRouterProvider.otherwise('/login');
}]);

starter.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if (event.which === 13) {
                scope.$apply(function () {
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
});
