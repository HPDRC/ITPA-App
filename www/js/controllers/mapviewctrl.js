"use strict;"

starter.controllers.controller('MapViewCtrl', ['$scope', 'toastr',
function ($scope, toastr) {

    var map = ITPACore.global_map_object;
    var resizeCount = 0;
    var resizeInterval;

    if (map == undefined) {
        ITPACore.global_map_object = map = new tf.map.Map(ITPACore.GetMapSettings());
        $scope.onRegisterMap({ map: map });
        //resizeMap();
        //setTimeout(function () { resizeMap(); setInterval(resizeMap, 5000); }, 1000);
        setTimeout(function () {
            resizeMap();
            resizeInterval = setInterval(resizeMap, 5000);
        }, 1000);
    }

    function resizeMap() {
        map.OnResize();
        resizeCount++;
        if (resizeCount > 4) {
            if (resizeInterval) {
                clearInterval(resizeInterval);
                resizeInterval = undefined;
            }
        }
    }
}]);
