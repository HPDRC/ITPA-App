"use strict";

starter.services.factory('GeoLocate', ['$ionicPlatform', '$cordovaGeolocation', 'toastr', function ($ionicPlatform, $cordovaGeolocation, toastr) {
    //console.log('GeoLocate service instantiated');
    var maximumAge = 800;
    //var maximumAge = Infinity;
    var timeout = 15000, watchNextTimeout = 1000, toggleAccuracyMinErrors = 2;
    var count = 0, errorCount = 0, consecutiveErrorCount = 0, toggledAccuracyCount = 0;
    var lastLocation, lastError;
    var geolocationWatchSettings = { maximumAge: maximumAge, timeout: timeout, enableHighAccuracy: true, };
    //var useToaster = ITPACore.useDebugGeolocation;
    //var toasterMax = 1;
    //var toasterCounter = toasterMax;
    //var exceptionError = 'exception during getCurrentPosition success handler';

    function watchNext() {
        setTimeout(startWatch, watchNextTimeout);
    }

    function startWatch() {
        //if (useToaster) { if (++toasterCounter >= toasterMax) { toasterCounter = 0; } if (toasterCounter == 0) { toastr.info("geolocation call", { timeOut: 200 }); } }
        $cordovaGeolocation
            .getCurrentPosition(geolocationWatchSettings)
            .then(function (position) {
                try {
                    lastLocation = position;
                    //if (useToaster && toasterCounter == 0) { toastr.info("lon " + lastLocation.coords.longitude.toFixed(5) + ' lat ' + lastLocation.coords.latitude.toFixed(5), undefined, { timeOut: 500 }); }
                    lastError = undefined;
                    ++count;
                    consecutiveErrorCount = 0;
                    if (!geolocationWatchSettings.enableHighAccuracy) {
                        geolocationWatchSettings.enableHighAccuracy = true;
                        ++toggledAccuracyCount;
                    }
                }
                catch (e) {
                    //console.log(exceptionError);
                }
                watchNext();
            }, function (err) {
                try {
                    //if (useToaster) { toastr.info("ERROR: " + err.message, { timeOut: 1000 }); }
                    lastLocation = undefined;
                    lastError = err;
                    ++errorCount;
                    if (geolocationWatchSettings.enableHighAccuracy) {
                        if (++consecutiveErrorCount >= toggleAccuracyMinErrors) {
                            geolocationWatchSettings.enableHighAccuracy = false;
                            consecutiveErrorCount = 0;
                            ++toggledAccuracyCount;
                        }
                    }
                }
                catch (e) {
                    //console.log(exceptionError);
                }
                watchNext();
            });
    }

    $ionicPlatform.ready(function () { startWatch(); });

    return {
        getLastLocation: function () {
            return lastLocation;
        },
        getInfo: function () {
            return {
                count: count,
                errorCount: errorCount,
                lastLocation: lastLocation,
                enableHighAccuracy: geolocationWatchSettings.enableHighAccuracy,
                toggledAccuracyCount: toggledAccuracyCount,
                lastError: lastError
            };
        }
    };
}]);
