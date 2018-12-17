"use strict";

var StreetSmartRoadProbLayer = function (settings) {
    var theThis, layer, keyedList, minIndex, features;

    this.RefreshFromList = function () { return refreshFromList(); }
    this.SetMinIndex = function (minIndex) { return setMinIndex(minIndex); }
    this.GetMinIndex = function () { return minIndex; }

    function getBlockStyle(block) {
        //var lineWidth = 12;
        var lineWidth = 6;
        var lineColor = g_settings.getColorForOccupancy01(block.realTimeProbability);

        return [
                { line: true, line_width: lineWidth + 2, line_color: "#88f", zindex: 1, line_dash: [20, 10] },
                { line: true, line_width: lineWidth, line_color: lineColor, line_opacity: 70, zindex: 2 }
        ];
    }

    function setMinIndex(minIndexSet) {
        minIndexSet = tf.js.GetIntNumberInRange(minIndexSet, 0, g_settings.occupancyColors.length - 1, minIndex);
        if (minIndexSet != minIndex) {
            minIndex = minIndexSet;
            refreshLayer();
        }
    }

    function refreshLayer() {
        layer.RemoveAllFeatures();

        for (var i = minIndex ; i < features.length ; ++i) {
            layer.AddMapFeature(features[i], true);
        }

        layer.AddWithheldFeatures();
    }

    function refreshFromList() {
        if (!!layer) {
            var list = keyedList.GetKeyedItemList();
            var coords = [];
            var nMultiLines = g_occupancyColors.length;
            var multiLineCoords = new Array(nMultiLines);
            features = [];
            for (var i in list) {
                var item = list[i], block = item.GetData();
                var geometry = block.geometry;
                var colorIndex = g_settings.getColorIndexForOccupancy01(block.realTimeProbability);
                if (colorIndex !== undefined) {
                    if (multiLineCoords[colorIndex] == undefined) {
                        multiLineCoords[colorIndex] = [];
                    }
                    multiLineCoords[colorIndex].push(geometry.coordinates);
                }
            }
            for (var i in multiLineCoords) {
                var thisCoords = multiLineCoords[i];
                var index = parseInt(i, 10);

                if (thisCoords !== undefined) {
                    var block = { realTimeProbability: index / 10 };
                    var mapFeature = new tf.map.Feature({
                        type: "multilinestring", coordinates: thisCoords, style: getBlockStyle(block)
                    }
                    );
                    mapFeature.block = block;
                    features.push(mapFeature);
                }
            }
            refreshLayer();
        }
    }

    function initialize() {
        minIndex = 0;
        settings = tf.js.GetValidObjectFrom(settings);
        if (tf.js.GetIsInstanceOf(settings.layer, tf.map.FeatureLayer) &&
            tf.js.GetIsInstanceOf(settings.keyedList, tf.js.KeyedList)) {
            layer = settings.layer;
            keyedList = settings.keyedList;
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

starter.services.factory('StreetSmartService', ['$http', 'toastr', function ($http, toastr) {
    //console.log('StreetSmart service instantiated');

    var refreshDispatcher = new tf.events.EventNotifier({ eventName: "refresh" });

    var roadProbKeyedList = new tf.js.KeyedList({
        name: "roadProbKeyedList",
        getKeyFromItemData: function (itemData) { return tf.js.GetIsValidObject(itemData) ? itemData.id : null; },
        needsUpdateItemData: function (updateObj) {
            return true;
            //return updateObj.itemData.realTimeProbability != updateObj.itemDataSet.realTimeProbability;
        }
    });

    function preProcessServiceData(data) {
        var parsedData = [];
        if (tf.js.GetIsValidObject(data)) {
            for (var i in data) {
                var block = data[i];
                var node1Coords = [block.node1.lng, block.node1.lat];
                var node2Coords = [block.node2.lng, block.node2.lat];
                block.geometry = { type: "linestring", coordinates: [node1Coords, node2Coords] };
                block.realTimeProbability = Math.random();
                parsedData.push(block);
            }
        }
        return parsedData;
    }

    var refreshRoadProb = function (coords) {
        if (!!(coords = tf.js.GetMapCoordsFrom(coords))) {
            $http({
                method: 'GET', url: g_settings.streetSmartRoadGraphProbRestURL,
                params: { "userLat": '' + coords[1], "userLng": '' + coords[0], "showRealTime": "true" }
            }).then(function successCallback(response) {
                if (tf.js.GetIsValidObject(response) && tf.js.GetIsValidObject(response.data) && tf.js.GetIsArray(response.data.blocks)) {
                    roadProbKeyedList.UpdateFromNewData(preProcessServiceData(response.data.blocks));
                    refreshDispatcher.Notify();
                }
            }, function errorCallback(response) { });
        }
    }

    function deliverParking(nodes, callBack) {
        var title = g_settings.searchForParkingTitle;
        if (!!nodes) {
            toastr.info("Found search path", title, { timeOut: 3000 });
        }
        else {
            toastr.error("Search path not found", title, { timeOut: 3000 });
        }

        callBack(nodes);
    }

    var searchParking = function (coords, callBack) {
        if (!!(callBack = tf.js.GetFunctionOrNull(callBack))) {
            if (!!(coords = tf.js.GetMapCoordsFrom(coords))) {
                $http({
                    method: 'GET', url: g_settings.streetSmartSearchParkingRestURL,
                    params: { "userLat": '' + coords[1], "userLng": '' + coords[0] }
                }).then(function successCallback(response) {
                    if (tf.js.GetIsValidObject(response) && tf.js.GetIsValidObject(response.data) && tf.js.GetIsArray(response.data.nodes)) {
                        deliverParking(response.data.nodes, callBack);
                    }
                    else {
                        deliverParking(undefined, callBack);
                    }
                }, function errorCallback(response) { deliverParking(undefined, callBack); });
            }
        }
    }

    return {
        getRoadProbKeyedList: function () { return roadProbKeyedList; },
        refreshRoadProb: refreshRoadProb,
        addRefreshListener: function (callBack) { return refreshDispatcher.Add(callBack); },
        searchParking: searchParking
    };
}]);
