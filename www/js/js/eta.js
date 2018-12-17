"use strict";

ITPACore.ETA = function (settings) {
    var theThis, busKeyedList, stopsKeyedList, linesKeyedList, busLayer, preProcessServiceData, featureName;

    this.GetFeatureName = function () { return featureName; }

    this.UpdateFromNewData = function (data) { return updateFromNewData(data); }

/*
{
    "identifier": "17 ST@MERIDIAN AV",
    "eta": "2016-06-28 09:31:50.0",
    "platform_id": "363",
    "public_transport_vehicle_id": "1787"
},
*/

    function updateFromNewData(data) {
        if (data = preProcessServiceData(data)) {
            var buses = {}/*, stops = {}*/;

            for (var i in data) {
                var itemData = data[i];
                var busId = itemData.public_transport_vehicle_id;
                var busItem = busKeyedList.GetItem(busId);
                if (!!busItem) {
                    var etaLineId = itemData.route_key;//itemData.line_id;
                    var busDataProps = busItem.GetData().properties;
                    var busLine = busDataProps.line_id;
                    if (busLine == etaLineId) {
                        var stopId = itemData.platform_id;
                        var stopItem = stopsKeyedList.GetItem(stopId);
                        var eta = itemData.eta;

                        if (!!stopItem) {
                            var etaLine = linesKeyedList.GetItem(etaLineId);
                            if (!!etaLine) {
                                //var lineKey = etaLine.GetKey();
                                //var stopLine = stopItem.lines[lineKey];
                                var stopLine = stopItem.lines[etaLineId];

                                if (!!stopLine) {
                                    var etaItem = {
                                        lineId: etaLineId,
                                        busItem: busItem,
                                        busItemId: busId,
                                        stopItem: stopItem,
                                        stopItemId: stopId,
                                        eta: eta,
                                        dateTime: tf.js.GetDateFromTimeStamp(eta)
                                    };

                                    if (buses[busId] == undefined) {
                                        buses[busId] = { count: 1, etas: [], etaDestItem: busItem, etaDestItemId: busId, etaDestItemFeature: ITPACore.busFeatureName };
                                    }
                                    else { ++buses[busId].count; }

                                    buses[busId].etas.push(etaItem);

                                } //else { console.log('eta for line ' + etaLineId + ' uses stop out of line: ' + stopId + ' with bus id: ' + busId); }
                            } //else { console.log('eta for unknown line ' + etaLineId + ' plat id: ' + stopId); }
                        } //else { console.log('bus: ' + busId + ' with eta to unknown stop: ' + stopId); }
                    } //else { console.log('eta for wrong bus line, busId: ' + busId + ' plat id: ' + stopId + ' bus line: ' + busLine + ' eta line: ' + etaLineId); }
                } //else { console.log('eta for unknown bus id: ' + busId); }
            }

            var allBusItems = busKeyedList.GetKeyedItemList(), allBusKeys = busKeyedList.GetKeyList();

            for (var i in allBusItems) {
                var busItem = allBusItems[i];
                //var busId = busItem.GetData().properties.public_transport_vehicle_id;
                busItem.etaList = buses[allBusKeys[i]];
            }
            busLayer.OnItemsUpdated({ items: allBusItems, keys: allBusKeys });
        }
    }

    function initialize() {
        settings = tf.js.GetValidObjectFrom(settings);
        featureName = ITPACore.etaFeatureName;
        var featureLayers = ITPACore.featureLayers;
        busLayer = featureLayers.GetFeatureLayer(ITPACore.busFeatureName);
        busKeyedList = featureLayers.GetKeyedList(ITPACore.busFeatureName);
        stopsKeyedList = featureLayers.GetKeyedList(ITPACore.stopsFeatureName);
        linesKeyedList = featureLayers.GetKeyedList(ITPACore.linesFeatureName);
        preProcessServiceData = ITPACore.GetFeaturePreProcessServiceData(featureName);
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
