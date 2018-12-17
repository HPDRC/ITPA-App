"use strict";

starter.services.factory('ITPAUser', ['$http', function ($http) {

    var loginURL = ITPACore.GetNewAuthService();

    function access(user, then, error) {
        var url = loginURL + '?' + tf.js.ObjectToURLParams(user);
        var req = { method: 'GET', url: url, data: user, headers: { 'Content-Type': 'application/json' } };
        $http(req).
            success(function (data, status, headers, config) {
                if (tf.js.GetFunctionOrNull(then)) {
                    then(data, status, headers, config);
                }
            }).
            error(function (data, status, headers, config) {
                if (tf.js.GetFunctionOrNull(error)) {
                    error(data, status, headers, config);
                }
            });
        return 0;
    };

    return {
        access: access
    };
}]);
