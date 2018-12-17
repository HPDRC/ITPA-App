"use strict";

ITPACore.HomeOngoing = function (settings) {
    var theThis, isTracking, geoLocate, lastGeoLocation, lastLocation, itpaFeatureLayers;
    var map, mapButtons, onFeatureRefreshCB, ETAs, onMapButtonClickedCB;
    var garBtn, busBtn, incBtn, msgBtn, searchBtn, dirBtn, buttons, buttonFeatureNames, onETARefreshCB;
    var bkColorOn, bkColorOff;
    var trackIndex, trackTimeOut, lastMapButtonClicked;
    var featurePeriodicRefresh;
    var toastr;
    var loadedLines, loadedStops;
    var needBusFullUpdate;
    var polyCode;
    var homeNotification;
    var $http;

    this.UpdateNow = function (featureName) {
        if (isSocketWorking()) {
            var dataSetName = socketDataSetByFeatureName[featureName];
            if (dataSetName) { socket.emit(get_last_data_set, dataSetName); }
        }
    }
    this.ClickOnMapButton = function (featureName) { return onMapButtonClicked(featureName); }
    this.GetLastMapButtonClicked = function () { return lastMapButtonClicked; }
    this.RefreshSearch = function () {
        if ($http) {
            var url = ITPACore.GetSearchServiceUrl();
            $http({
                method: 'GET',
                //headers: headers,
                //params: {},
                url: url
            }).then(function successCallback(response) {
                var data = (tf.js.GetIsValidObject(response) && tf.js.GetIsValidObject(response.data)) ? response.data : undefined;
                onRefreshedData({ featureName: ITPACore.searchFeatureName, data: data });
            }, function errorCallback(response) {
                console.log('failed search call to: ' + url);
            });
        }
    };

    this.OnMapLoaded = function (theMap, thenCallBack) { if (map = tf.js.GetMapFrom(theMap)) { itpaFeatureLayers = ITPACore.featureLayers; createMapButtons(); initialRefresh(thenCallBack); } };
    this.CheckButtonsEnabled = function () { return checkButtonsEnabled(); };
    this.GetLastLocation = function () { return lastLocation; };
    this.GetIsTracking = function () { return isTracking; };
    this.StartLocationTrack = function () {
        if (!isTracking) { itpaFeatureLayers = ITPACore.featureLayers; if (isTracking = (!!geoLocate && !!itpaFeatureLayers)) { doTrack(); } }
    };

    function doTrack() {
        lastGeoLocation = geoLocate.getLastLocation();
        if (lastGeoLocation) {
            var coords = lastGeoLocation.coords;
            var newLocation = [coords.longitude, coords.latitude];
            if (lastLocation === undefined || lastLocation[0] !== newLocation[0] || lastLocation[1] !== newLocation[1]) {
                itpaFeatureLayers.SetUserLocation(lastLocation = newLocation);
            }
            if (trackIndex === 1) { logActivity(); }
            if (++trackIndex >= ITPACore.trackReportCount) { trackIndex = 1; }
        }
        if (isTracking) { setTimeout(doTrack, trackTimeOut); }
    };

    var socket;
    var itpa_track_device_type = 'itpa_track_device';
    var lastButtonSubscriptions;
    var subscribe_data_change = 'subscribe_data_change';
    var unsubscribe_data_change = 'unsubscribe_data_change';
    var notify_data_change = 'notify_data_change';

    var itpa_buses_current = 'itpa_buses_current?features';
    var itpa_bus_routes = 'itpa_bus_routes';
    var itpa_bus_stops = 'itpa_bus_stops?features';
    var itpa_bus_etas = 'itpa_bus_etas';

    var fl511_messages_type = 'fl511_messages_current?features';
    var flhsmv_incidents_type = 'flhsmv_incidents_current?features';

    var itpa_parking_sites_type = 'itpa_parking_sites?features';
    var itpa_parking_decals = 'itpa_parking_decals';
    var itpa_parking_availability = 'itpa_parking_availability';
    var itpa_parking_recommendations = 'itpa_parking_recommendations';

    var itpa_notifications_active = 'itpa_notifications_active';

    var get_last_data_set = 'get_last_data_set';

    function isSocketWorking() { return socket && socket.connected && isAuthenticated; };

    function logActivity() {
        if (isSocketWorking()) {
            socket.emit(itpa_track_device_type, ITPACore.GetDeviceActivityData(lastGeoLocation));
        }
    };

    function addRemoveSubscriptions(buttonType, isAdd) {
        if (isSocketWorking() && buttonType) {
            var subscriptions = [];
            switch (buttonType) {
                case ITPACore.busFeatureName:
                    subscriptions = [
                        { name: itpa_bus_routes/*, preventEmitBack: loadedLines*/ },
                        { name: itpa_bus_stops/*, preventEmitBack: loadedStops*/ },
                        { name: itpa_buses_current },
                        { name: itpa_bus_etas }
                    ];
                    break;
                case ITPACore.garFeatureName:
                    subscriptions = [
                        { name: itpa_parking_decals },
                        { name: itpa_parking_sites_type },
                        { name: itpa_parking_availability },
                        { name: itpa_parking_recommendations }
                    ];
                    break;
                case ITPACore.msgFeatureName: subscriptions = [{ name: fl511_messages_type }]; break;
                case ITPACore.incFeatureName: subscriptions = [{ name: flhsmv_incidents_type }]; break;
            }
            if (subscriptions.length) {
                var verb = isAdd ? subscribe_data_change : unsubscribe_data_change;
                for (var i in subscriptions) {
                    var subs = subscriptions[i];
                    socket.emit(verb, subs.name, subs.preventEmitBack);
                }
            }
        }
    };

    function updateSubscriptions(newButtonSubscriptions) {
        if (lastButtonSubscriptions != newButtonSubscriptions) {
            addRemoveSubscriptions(lastButtonSubscriptions, false);
            addRemoveSubscriptions(lastButtonSubscriptions = newButtonSubscriptions, true);
        }
    };

    var isAuthenticated;

    function initSocket() {
        if (!socket) {
            socket = io.connect(ITPACore.GetNewITPAServer(), { path: "/socketio/socketio/socket.io"/*, transports: ['websocket']*/ });
            socket.on('disconnect', function () {
                isAuthenticated = false;
            });
            socket.on('connect', function () {
                isAuthenticated = false;
                //console.log('CONNECTED TO SOCKET IO');
                socket.emit('authentication', {
                    token: ITPACore.AccessToken
                });
            });
            socket.on('authenticated', function (authResult) {
                //console.log('authenticated: ' + JSON.stringify(authResult));
                isAuthenticated = true;
                lastButtonSubscriptions = undefined;
                updateSubscriptions(lastMapButtonClicked);
                socket.emit(subscribe_data_change, itpa_notifications_active, false);
                if (authResult.trackSeconds !== undefined) {
                    ITPACore.trackReportCount = authResult.trackSeconds;
                }
            });
            socket.on(notify_data_change, function (data_set_name, data_set) {
                //console.log("GOT DATA CHANGE " + data_set_name);
                try {
                    var featureName = featureNameBySocketDataSet[data_set_name];
                    //data_set = JSON.parse(data_set);
                    if (data_set) {
                        var data;
                        switch (data_set_name) {
                            // cases below will not update features
                            case itpa_notifications_active:
                                //console.log("GOT DATA CHANGE " + data_set_name);
                                if (homeNotification) {
                                    data = data_set.data;
                                    if (data) {
                                        for (var i in data) {
                                            var d = data[i];
                                            d.notification_id = d.id;
                                            if (d.start_on) {
                                                d.start_on = d.start_on.replace('T', ' ');
                                                d.start_on = ITPACore.CVTDate(d.start_on);
                                            }
                                            if (d.expire_on) {
                                                d.expire_on = d.expire_on.replace('T', ' ');
                                                d.expire_on = ITPACore.CVTDate(d.expire_on);
                                            }
                                        }
                                        data.sort(function (a, b) { return a.notification_id - b.notification_id; });
                                        homeNotification.OnNotificationsReceived(data);
                                    }
                                }
                                break;
                            case itpa_parking_decals:
                                data = data_set.data;
                                var decalMap = {};
                                for (var i in data) {
                                    var d = data[i];
                                    if (typeof (d.id) == "number" && tf.js.GetIsNonEmptyString(d.name) && tf.js.GetIsNonEmptyString(d.description)) {
                                        decalMap['' + d.id] = d;
                                    }
                                }
                                ITPACore.pkRecommendationsDecalMap = decalMap;
                                break;
                            // cases below will update features
                            case itpa_parking_recommendations:
                                data = data_set.data;
                                break;
                            case itpa_parking_availability:
                                data = data_set.data;
                                break;
                            case itpa_bus_etas:
                                data = data_set.data;
                                for (var i in data) {
                                    var d = data[i];
                                    var fleet = d.fleet;
                                    var fleetKeyPrefix = fleet + '|';
                                    d.eta = d.eta.replace('T', ' ');
                                    d.eta = ITPACore.CVTDate(d.eta);
                                    if (d.last_updated) {
                                        d.last_updated = d.last_updated.replace('T', ' ');
                                        d.last_updated = ITPACore.CVTDate(d.last_updated);
                                    }
                                    d.public_transport_vehicle_id = fleetKeyPrefix + d.bus_id;
                                    d.platform_id = fleetKeyPrefix + d.stop_id;
                                    d.route_key = fleetKeyPrefix + d.route_id;
                                }
                                break;
                            case itpa_bus_routes:
                                var newData = [];
                                data = data_set.data;
                                for (var i in data) {
                                    var oldD = data[i], oldP = oldD;
                                    var newD = {
                                        properties: tf.js.ShallowMerge(oldP)
                                    }, newP = newD.properties;
                                    newP.key = oldP.fleet + '|' + oldP.id;
                                    newP.fleet_id = newP.line_id = oldP.id;
                                    newP.identifier = oldP.name;
                                    newP.platform_ids = oldP.compressed_stop_ids.split(',');
                                    newD.largeGeometry = newD.geometry = polyCode.ToGeoJSONMultiLineStringNoFlip(oldD.compressed_multi_linestring, 6);
                                    newD.nPointsLargeGeometry = newD.nPointsGeometry = tf.js.CountMLSPoints(newD.geometry);
                                    newD.nPointsSmallToLarge = 1;
                                    newData.push(newD);
                                }
                                data_set = newData;
                                break;
                            case itpa_bus_stops:
                                data = data_set.features;
                                for (var i in data) {
                                    var d = data[i], p = d.properties;
                                    p.key = p.fleet + '|' + p.id;
                                    p.platform_id = p.id;
                                    p.fleet_id = p.id;
                                    p.identifier = p.name;
                                }
                                break;
                            case itpa_buses_current:
                                data = data_set.features;
                                for (var i in data) {
                                    var d = data[i], p = d.properties;
                                    p.key = p.fleet + '|' + p.id;
                                    p.public_transport_vehicle_id = p.id;
                                    p.coordinate_updated = p.coordinate_updated.replace('T', ' ');
                                    p.datetime = ITPACore.CVTDate(p.coordinate_updated);
                                    p.number_of_occupants = Math.floor(p.occupancy_percentage * 1000);
                                    p.speed = p.speed_mph;
                                    p.heading = p.heading_degree;
                                    p.line_id = p.fleet + '|' + p.route_id;
                                    if (p.fleet == 'utma') {
                                        p.fleet_order = 0;
                                    }
                                    else if (p.fleet == 'fiu') {
                                        p.fleet_order = 1;
                                    }
                                    else {
                                        p.fleet_order = 2;
                                    }
                                }
                                /*
                                var extraRecord = tf.js.ShallowMerge(data[0]);
                                var erP = extraRecord.properties;
                                erP.fleet = 'utma';
                                erP.name = 'SW-6';
                                erP.route_id = '1';
                                erP.line_id = erP.fleet + '|' + erP.route_id;
                                erP.fleet_order = 0;
                                data.push(extraRecord);
                                */
                                if (data && data.length) {
                                    data.sort(function (a, b) {
                                        var ap = a.properties;
                                        var bp = b.properties;
                                        if (ap.fleet_order < bp.fleet_order) { return -1; }
                                        if (ap.fleet_order > bp.fleet_order) { return 1; }
                                        if (ap.route_id < bp.route_id) { return -1; }
                                        if (ap.route_id > bp.route_id) { return 1; }
                                        if (ap.id < bp.id) { return -1; }
                                        if (ap.id > bp.id) { return 1; }
                                        return 0;
                                    });
                                    var len = data.length;
                                    for (var i = 0; i < len; ++i) {
                                        data[i].properties.order = i + 1;
                                    }
                                }
                                break;
                            case fl511_messages_type:
                                data = data_set.features;
                                for (var i in data) {
                                    var d = data[i], p = d.properties;
                                    p.message_board_id = p.id;
                                    p.message_on = p.message_on.replace('T', ' ');
                                    p.last_updated = p.last_updated.replace('T', ' ');
                                    p.message_on = ITPACore.CVTDate(p.message_on);
                                    p.record_updated = ITPACore.CVTDate(p.last_updated);
                                    p.message_board_location = p.location;
                                }
                                break;
                            case flhsmv_incidents_type:
                                data = data_set.features;
                                for (var i in data) {
                                    var d = data[i], p = d.properties;
                                    p.event_id = p.id;
                                    p.date = p.date.replace('T', ' ');
                                    p.dispatch_time = ITPACore.CVTDate(p.date);
                                    p.incident_id = p.external_id;
                                    p.external_incident_type = p.type;
                                }
                                break;
                            case itpa_parking_sites_type:
                                data = data_set.features;
                                for (var i in data) {
                                    var d = data[i], p = d.properties;
                                    p.parking_site_id = p.id;
                                    p.parking_site_type_name = p.type_name;
                                    p.parking_site_type_id = p.type_id;
                                    p.total_level = p.number_of_levels;
                                    p.centroid = !p.lon || !p.lat ? undefined : [p.lon, p.lat];
                                }
                                break;
                        }
                    }
                    if (featureName) { onRefreshedData({ featureName: featureName, data: data_set }); }
                } catch (e) {
                    console.log('EXCEPTION: ' + e.message);
                }
            });
        }
    };

    function onMapButtonClicked(featureName) {
        if (lastMapButtonClicked != featureName) {
            updateSubscriptions(featureName);
            lastMapButtonClicked = featureName;
            if (onMapButtonClickedCB) { onMapButtonClickedCB(featureName); }
        }
    }

    function getOnMapButtonClicked(featureName) { return function() { return onMapButtonClicked(featureName); } }

    function createMapButtons() {
        if (!!map) {
            var mapButtonStyles = { position: "absolute", left: "6px", top: "12px", pointerEvents: 'none' };
            var result = ITPACore.CreateMapControlButtonHolder(map, mapButtonStyles);
            var div = result.div;

            mapButtons = result.holder;
            div.GetHTMLElement().parentNode.style.zIndex = 2;

            var show = true;
            var bkColor = bkColorOff;

            dirBtn = ITPACore.CreateMapButton2("itpa-mapdir-button", getOnMapButtonClicked(ITPACore.directionsFeatureName), div, show, bkColor, "button button-clear mapButtonLeft");
            busBtn = ITPACore.CreateMapButton2("itpa-mapbus-button", getOnMapButtonClicked(ITPACore.busFeatureName), div, show, bkColor, "button button-clear mapButtonLeft");
            garBtn = ITPACore.CreateMapButton2("itpa-mapgar-button", getOnMapButtonClicked(ITPACore.garFeatureName), div, show, bkColor, "button button-clear mapButtonLeft");
            incBtn = ITPACore.CreateMapButton2("itpa-mapinc-button", getOnMapButtonClicked(ITPACore.incFeatureName), div, show, bkColor, "button button-clear mapButtonLeft");
            msgBtn = ITPACore.CreateMapButton2("itpa-mapmsg-button", getOnMapButtonClicked(ITPACore.msgFeatureName), div, show, bkColor, "button button-clear mapButtonLeft");
            searchBtn = ITPACore.CreateMapButton2("itpa-mapsearch-button", getOnMapButtonClicked(ITPACore.searchFeatureName), div, show, bkColor, "button button-clear mapButtonLeft");

            buttons = {};
            buttons[ITPACore.garFeatureName] = garBtn;
            buttons[ITPACore.busFeatureName] = busBtn;
            buttons[ITPACore.incFeatureName] = incBtn;
            buttons[ITPACore.msgFeatureName] = msgBtn;
            buttons[ITPACore.searchFeatureName] = searchBtn;
            buttons[ITPACore.directionsFeatureName] = dirBtn;
            buttonFeatureNames = [ITPACore.garFeatureName, ITPACore.busFeatureName, ITPACore.incFeatureName,
                ITPACore.msgFeatureName, ITPACore.searchFeatureName, ITPACore.directionsFeatureName];
        }
    }

    function checkButtonEnabled(featureName) {
        if (!!buttons) {
            var button = buttons[featureName];
            if (!!button) {
                var isOn;
                
                if (featureName != ITPACore.directionsFeatureName) {
                    isOn = itpaFeatureLayers.IsLayerShowing(featureName);
                }
                else {
                    isOn = lastMapButtonClicked == featureName;
                }
                button.style.backgroundColor = isOn ? bkColorOn : bkColorOff;
            }
        }
    }

    function checkButtonsEnabled() {
        if (!!buttonFeatureNames) { for (var i in buttonFeatureNames) { checkButtonEnabled(buttonFeatureNames[i]); } }
    }

    function onRefreshedData(notification) {
        var featureName = notification.featureName;
        var data = notification.data;
        if (!data) { data = []; }
        if (featureName == ITPACore.pkrecFeatureName) {
            var garList = !!ITPACore.featureLayers ? ITPACore.featureLayers.GetKeyedList(ITPACore.garFeatureName) : undefined;
            if (!!garList) {
                var data = !!notification ? ITPACore.featurePreProcessServiceData[ITPACore.pkrecFeatureName](notification.data) : [];
                garList.NotifyItemsUpdated();
            }
        }
        else if (featureName == ITPACore.etaFeatureName) {
            ETAs.UpdateFromNewData(data);
            if (onETARefreshCB) { onETARefreshCB(); }
        }
        else {
            itpaFeatureLayers.UpdateFromNewData(featureName, data);
            if (featureName == ITPACore.linesFeatureName) {
                loadedLines = true;
                ITPACore.linesAndStopsAreLinked = false;
                needBusFullUpdate = true;
            }
            else if (featureName == ITPACore.stopsFeatureName) {
                loadedStops = true;
                ITPACore.linesAndStopsAreLinked = false;
            }
            if (!ITPACore.linesAndStopsAreLinked) { if (loadedLines && loadedStops) { ITPACore.LinkLinesAndStops(); } }
            if (onFeatureRefreshCB) { onFeatureRefreshCB(featureName); }
        }
    };

    function initialRefresh(thenCallBack) {
        ETAs = new ITPACore.ETA({});
        if (tf.js.GetFunctionOrNull(thenCallBack)) { thenCallBack(); }
    }

    var socketDataSetByFeatureName, featureNameBySocketDataSet;

    function initialize() {

        socketDataSetByFeatureName = {};
        socketDataSetByFeatureName[ITPACore.pkrecFeatureName] = itpa_parking_recommendations;
        socketDataSetByFeatureName[ITPACore.occFeatureName] = itpa_parking_availability;
        socketDataSetByFeatureName[ITPACore.etaFeatureName] = itpa_bus_etas;
        socketDataSetByFeatureName[ITPACore.stopsFeatureName] = itpa_bus_stops;
        socketDataSetByFeatureName[ITPACore.linesFeatureName] = itpa_bus_routes;
        socketDataSetByFeatureName[ITPACore.busFeatureName] = itpa_buses_current;
        socketDataSetByFeatureName[ITPACore.msgFeatureName] = fl511_messages_type;
        socketDataSetByFeatureName[ITPACore.incFeatureName] = flhsmv_incidents_type;
        socketDataSetByFeatureName[ITPACore.garFeatureName] = itpa_parking_sites_type;

        featureNameBySocketDataSet = {};

        for (var i in socketDataSetByFeatureName) {
            featureNameBySocketDataSet[socketDataSetByFeatureName[i]] = i;
        }

        polyCode = new tf.map.PolyCode();

        loadedLines = loadedStops = false;
        needBusFullUpdate = false;

        trackIndex = 1;
        trackTimeOut = 1000;

        bkColorOff = "rgba(255, 255, 255, 0.6)";
        bkColorOn = "rgba(255, 255, 255, 1)";

        if (tf.js.GetIsValidObject(settings)) {
            geoLocate = settings.geoLocate;
            onFeatureRefreshCB = tf.js.GetFunctionOrNull(settings.onFeatureRefresh);
            onETARefreshCB = tf.js.GetFunctionOrNull(settings.onETARefresh);
            onMapButtonClickedCB = tf.js.GetFunctionOrNull(settings.onMapButtonClicked);
            homeNotification = settings.homeNotification;
            toastr = settings.toastr;

            $http = settings.$http;

            featurePeriodicRefresh = {};

            initSocket();
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

