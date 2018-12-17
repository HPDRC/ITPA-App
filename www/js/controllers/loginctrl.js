"use strict";

starter.controllers.controller('LoginCtrl', ['$scope', '$state', '$cordovaDevice', '$http', 'ITPAUser', '$ionicPopup', 'toastr', 'GeoLocate',
    function ($scope, $state, $cordovaDevice, $http, ITPAUser, $ionicPopup, toastr, GeoLocate) {

    var loginMessageElement = document.getElementById("loginMessage"), popup;
    var credentialsName = "credentials";
    var accessGranted = false;
    var invalidParameters = false;

    function autoGrow(element) { if (!!element) { setTimeout(function () { element.style.height = "5px"; element.style.height = (element.scrollHeight) + "px"; }, 100); } }
    function closePopup() { if (!!popup) { popup.close(); popup = undefined; } }

    $scope.userLogin = {
        email: "",
        password: "",
        device_coord: undefined/*{ lng: 0, lat: 0 }*/,
        saveCredentials: true,
        needsCodeInput: false,
        canAskForCode: false,
        canPressLogin: false,
        showMessage: false,
        confirmationCode: "",
        message: ""
    };

    $scope.checkCanLogin = function () {
        if (tf.js.GetIsValidObject($scope.userLogin)) {
            var newCanPressLogin = (tf.js.GetIsNonEmptyString($scope.userLogin.email) > 0) && tf.js.GetIsNonEmptyString($scope.userLogin.password) &&
                (!(invalidParameters || accessGranted));
            if (newCanPressLogin != $scope.userLogin.canPressLogin) {
                $scope.userLogin.canPressLogin = newCanPressLogin;
            }
            //toastr.info(undefined, "after checkCanLogin " + $scope.userLogin.canPressLogin, { timeOut: 1000 });
        }
    }

    $scope.onToggleSaveCredentials = function () { if (!$scope.userLogin.saveCredentials) { delCredentials(); } }

    function saveCredentials () {
        window.localStorage.setItem(credentialsName, 
            JSON.stringify({ 
                email: $scope.userLogin.email,
                password: $scope.userLogin.password
            }));
        ITPACore.hasCredentialsSaved = true;
    }

    function checkCanLoginAndLogin() {
        $scope.checkCanLogin();
        if ($scope.userLogin.canPressLogin) { doLogin(false); }
    }

    function loadCredentials () {
        var credentials = window.localStorage.getItem(credentialsName);
        if (tf.js.GetIsNonEmptyString(credentials)) {
            credentials = JSON.parse(credentials)
            $scope.userLogin.email = credentials.email;
            $scope.userLogin.password = credentials.password;
        }
        //checkCanLoginAndLogin();
    }

    function delCredentials () {
        var credentials = window.localStorage.getItem(credentialsName);
        if (credentials != undefined) {
            window.localStorage.removeItem(credentialsName);
        }
        ITPACore.hasCredentialsSaved = false;
    }

    function showCheckingCredentialsPopup(title) {
        popup = $ionicPopup.show({ title: title, subTitle: 'please wait...', scope: $scope, });
    }

    function setMessage(message) {
        $scope.userLogin.message = message;
        $scope.userLogin.showMessage = true;
        autoGrow(loginMessageElement);
    }

    function showServerError(isDNS) {
        var alertPopup = $ionicPopup.alert({
            title: 'Please try again later...',
            template: isDNS ? 'Our DNS server may be undergoing scheduled maintenace.' : 'Our server may be undergoing scheduled maintenace.',
        });
    }

    function showCustomError(text) {
        var alertPopup = $ionicPopup.alert({
            title: 'Custom Error',
            template: text,
        });
    }

    function doLogin(askedForCode) {
        if (accessGranted) { return; }
        var popupTitle = askedForCode ? 'Requesting code' : 'Checking your credentials';
        showCheckingCredentialsPopup(popupTitle);
        var user = {
            user_name: $scope.userLogin.email,
            password: $scope.userLogin.password,
            confirmationCode: $scope.userLogin.confirmationCode/*,
            askedForConfirmationCode: askedForCode*/
        };
        if (askedForCode) { user.askedForConfirmationCode = true; }

        ITPAUser.access(user,
            function (response) {
                closePopup();
                setMessage(response.message);
                if (!!response.accessGranted) {
                    accessGranted = true;
                    ITPACore.AccessToken = response.token;
                    ITPACore.currentUser = user;
                    if ($scope.userLogin.saveCredentials) { saveCredentials(); }
                    var logInPopup = $ionicPopup.show({ title: "Logging in", subTitle: 'please wait...', scope: $scope, });
                    setTimeout(function () {
                        $state.go('app.home');
                        accessGranted = false;
                        logInPopup.close();
                    }, 200);
                }
                else if (response.invalidParameters) {
                    //showServerError();
                    $scope.userLogin.canAskForCode = false;
                    invalidParameters = true;
                    $scope.checkCanLogin();
                }
                else {
                    if (!$scope.userLogin.needsCodeInput) {
                        $scope.userLogin.needsCodeInput = response.codeSent || response.wrongCode;
                    }
                    if (!$scope.userLogin.canAskForCode) {
                        $scope.userLogin.canAskForCode = response.needsCode || response.expiredCode || response.wrongCode;
                    }
                    if (response.expiredCode) {
                        $scope.userLogin.confirmationCode = "";
                    }
                }
            },
            function (error) { closePopup(); showServerError(); }
        );
    }

    $scope.getCode = function () {
        var confirmPopup = $ionicPopup.confirm({
            title: 'Email Confirmation Code?',
            template: 'Select OK, then check your Inbox for a confirmation code.'
        });
        confirmPopup.then(function (res) { if (res) { doLogin(true); } else { } });
    };

    $scope.login = function () { doLogin(false); };

    function closeKbdDoLogin() {
        cordova.plugins.Keyboard.close();
        doLogin(false);
    }
    $scope.enterOnEmail = function () { closeKbdDoLogin(); }
    $scope.enterOnPassword = function () { closeKbdDoLogin(); }
    $scope.enterOnConfirmationCode = function () { closeKbdDoLogin(); }

    ITPACore.hasCredentialsSaved = false;
    ITPACore.delCredentialsCB = delCredentials;

    //toastr.info(undefined, "before loadCredentials", { timeOut: 1000 });
    loadCredentials();
    //toastr.info(undefined, "after loadCredentials", { timeOut: 1000 });

    //if (window.cordova) { ITPACore.SetCordovaDevice($cordovaDevice); }

    $scope.checkCanLogin()
}]);
