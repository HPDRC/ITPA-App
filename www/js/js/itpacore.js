"use strict";

var ITPACore = {

    useDebugGeolocation: false,

    AccessToken: "",
    private_deviceUUID: undefined,
    currentUser: {},

    isIOS: undefined,

    hasCredentialsSaved: false,

    delCredentialsCB: undefined,

    DeleteSavedCredentials: function () {
        if (ITPACore.hasCredentialsSaved) {
            if (ITPACore.delCredentialsCB != undefined) {
                ITPACore.delCredentialsCB();
            }
        }
    },

    directionsRouteFeature: undefined,
    minDistanceInMetersToBeFarFromDirections: 50,
    isFilteringIncForDistance: true,
    isFilteringMsgForDistance: true,

    SetIsFilteringMsgForDistance: function (boolSet) { ITPACore.isFilteringMsgForDistance = !!boolSet; },
    GetIsFilteringMsgForDistance: function () { return ITPACore.isFilteringMsgForDistance; },

    SetIsFilteringIncForDistance: function (boolSet) { ITPACore.isFilteringIncForDistance = !!boolSet; },
    GetIsFilteringIncForDistance: function () { return ITPACore.isFilteringIncForDistance; },

    GetNewITPAServer: function () {
        //return 'http://192.168.0.37:8080';
        //return 'http://162.213.149.38';
        //return 'http://itpa-stage3.cs.fiu.edu';
        return 'http://utma-api.cs.fiu.edu';
    },

    GetNewAuthService: function () { return ITPACore.GetNewITPAServer() + '/login'; },

    CVTDate: function (theDate) { return theDate + '.0'; },

    GetSearchServiceUrl: function () {
        var url;
        var urlStart = "http://acorn.cs.fiu.edu/cgi-bin/arquery.cgi?category=itpall&vid=itpa&numfind=20&tfaction=shortdisplayflash";
        var center, res;
        if (ITPACore.featureLayers != undefined) {
            var map = ITPACore.featureLayers.GetMap();
            center = map.GetCenter();
            res = map.GetResolution();
        }
        if (center == undefined) {
            center = ITPACore.mapHomeCenter;
            res = tf.units.GetResolutionByLevel(mapInitialLevel);
        }
        url = urlStart + "&Long=" + center[0] + "&Lat=" + center[1];
        if (ITPACore.featureLayers != undefined) {
            var queryStr = ITPACore.featureLayers.GetQueryStr();
            if (tf.js.GetIsNonEmptyString(queryStr)) {
                var encodedQueryStr = queryStr;
                encodedQueryStr = encodedQueryStr.replace(' ', '+');
                url += "&arcriteria=1&anyfield=" + encodedQueryStr;
            }
        }
        url += "&filetype=.json";
        return url;
    },

    GetStreetSmartServiceUrl: function () {
        var url = 'http://streetsmartdemo.cloudapp.net/roadGraphProb?';
        var lat = tf.consts.defaultLatitude, lng = tf.consts.defaultLongitude;
        url += 'userLat=' + lat + '&userLng=' + lng + '&showRealTime=true';
        return url;
    },

    itpaObjectName: "itpaObject",

    mapHomeCenter: [- 80.37158562505189, 25.755917973237928],
    mapHomeCenterOld: [-80.3762, 25.764],
    mapBBCCenter: [-80.140366, 25.910629],
    mapBBCCenterOld: [-80.14427913856048, 25.91346867681252],
    mapInitialLevel: 14,
    mapExtent: [-80.497512, 25.634097, -80.047760, 25.972819],
    mapMinLevel: 10,
    mapMaxLevel: 17,

    pkRecommendationsDecalMap: undefined,

    GetMapSettings: function () {

        return {
            container: "mapContainer",
            canRotate: false,
            center: ITPACore.mapHomeCenter,
            level: ITPACore.mapInitialLevel,
            mapType: "map",
            viewSettings: {
                enableRotation: false,
                minLevel: ITPACore.mapMinLevel,
                maxLevel: ITPACore.mapMaxLevel
            },
            showMapCenter: false,
            goDBOnDoubleClick: false,
            noNativePopups: true,
            noNativeControls: true,
            noScaleLine: true,
            panels: undefined
        };
    },

    geolocationWatchSettings: {
        timeout: 8000,
        enableHighAccuracy: false,
        maximumAge: Infinity
    },

    occupancyColors: [
        { index: 0, text: "1%", color: "#640f0f" }, { index: 1, text: "10%", color: "#8c0f0f" }, { index: 2, text: "20%", color: "#af1616" },
        { index: 3, text: "30%", color: "#ff3c1e" }, { index: 4, text: "40%", color: "#f06a1e" }, { index: 5, text: "50%", color: "#f5b91e" },
        { index: 6, text: "60%", color: "#f8e71c" }, { index: 7, text: "70%", color: "#b4d200" }, { index: 8, text: "80%", color: "#82ba00" },
        { index: 9, text: "90%", color: "#4a8e00" }, { index: 10, text: "99%", color: "#217a00" },
    ],

    occupancyUnknownColor: "#bfbfbf",

    stopBkColor: '#ffe57f',

    GetColorIndexForOccupancy01: function (oc01) {
        var colorIndex = undefined;
        if (oc01 !== undefined) {
            var nColors = ITPACore.occupancyColors.length - 1;
            oc01 = tf.js.NumberClip(tf.js.GetFloatNumber(oc01, 1), 0, 1);
            colorIndex = Math.floor(oc01 * nColors);
        }
        return colorIndex;
    },

    GetPercentStrFrom01: function (occ01) { return Math.round(100 * occ01) + '%'; },

    GetColorForOccupancy01: function (oc01) {
        var colorIndex = ITPACore.GetColorIndexForOccupancy01(oc01);
        return colorIndex == undefined ? ITPACore.occupancyUnknownColor : ITPACore.occupancyColors[colorIndex].color;
    },

    busFeatureName: "bus", msgFeatureName: "msg", incFeatureName: "inc", garFeatureName: "gar", occFeatureName: "occ",
    stopsFeatureName: "stp", linesFeatureName: "lns", searchFeatureName: "sch", etaFeatureName: "eta",
    directionsFeatureName: "dir", ssgFeatureName: "ssg", pkrecFeatureName: "pkr",

    serviceErrorRetryMillis: 60000,

    layerNames: undefined,
    layerZIndices: undefined,
    keyNames: undefined,
    needsUpdateItemData: undefined,
    featureStyles: undefined,
    featureButtonIcons: undefined,
    featureButtonIconsArray: undefined,
    featureRefreshStyleOnUpdate: undefined,
    externalFeatureRefreshStyleOnUpdate: undefined,
    featureFilterAddItems: undefined,
    featurePreProcessServiceData: undefined,
    featureLayerMinMaxLevels: undefined,

    AreMapCoordsInsideExtent: function (coords) {
        var mapExtent = ITPACore.mapExtent;
        return coords[0] >= mapExtent[0] && coords[0] <= mapExtent[2] && coords[1] >= mapExtent[1] && coords[1] <= mapExtent[3];
    },

    IsMapPointFeatureInsideExtent: function (itemData) {
        var isInside = false;
        try {
            var geometry = !!itemData ? itemData.geometry : null;
            if (!!geometry) { isInside = ITPACore.AreMapCoordsInsideExtent(geometry.coordinates); }
        }
        catch (e) { isInside = false; }
        return isInside;
    },

    GetAllFeatureNames: function () {
        return [ITPACore.busFeatureName, ITPACore.msgFeatureName, ITPACore.incFeatureName, ITPACore.garFeatureName, ITPACore.ssgFeatureName,
        ITPACore.occFeatureName, ITPACore.stopsFeatureName, ITPACore.linesFeatureName, ITPACore.searchFeatureName, ITPACore.directionsFeatureName, ITPACore.etaFeatureName,
        ITPACore.pkrecFeatureName
        ]
    },

    GetFeaturesWithMapLayersNames: function () {
        return [ITPACore.busFeatureName, ITPACore.msgFeatureName, ITPACore.incFeatureName, ITPACore.garFeatureName, ITPACore.ssgFeatureName,
        ITPACore.occFeatureName, ITPACore.stopsFeatureName, ITPACore.linesFeatureName, ITPACore.searchFeatureName,
        ITPACore.directionsFeatureName]
    },

    getFeatureListFromData: function (data) {
        if (tf.js.GetIsValidObject(data) && tf.js.GetIsArray(data.features)) { data = data.features; }
        else { data = undefined; }
        return data;
    },

    getMonthDay: function (itpaDateStamp) {
        var dt = tf.js.GetDateFromTimeStamp(itpaDateStamp);
        var day = dt.getDate();
        var mon = dt.getMonth();
        return (mon + 1) + '/' + day;
    },

    getAmPmHourWithSecs: function (itpaDateStamp) {
        var str = itpaDateStamp.substring(11, 11 + 8);
        var hourStr = str.substring(0, 2);
        var hour = parseInt(hourStr, 10);
        var minStr = str.substring(3, 5);
        var secStr = str.substring(6, 8);
        var ispm = hour > 12;
        var ampm = ispm ? ' pm' : ' am';
        hourStr = ispm ? hour - 12 : hour;
        return hourStr + ':' + minStr + ':' + secStr + ampm;
    },

    getAmPmHour: function (itpaDateStamp) {
        var str = itpaDateStamp.substring(11, 11 + 5);
        var hourStr = str.substring(0, 2);
        var hour = parseInt(hourStr, 10);
        var minStr = str.substring(3, 5);
        var ispm = hour > 12;
        var ampm = ispm ? ' pm' : ' am';
        hourStr = ispm ? hour - 12 : hour;
        return hourStr + ':' + minStr + ampm;
    },

    addFeatureItemFunctions: undefined,

    GetAddFeatureItemFunction: function (featureName) {
        if (ITPACore.addFeatureItemFunctions == undefined) {
            ITPACore.addFeatureItemFunctions = {};

            ITPACore.addFeatureItemFunctions[ITPACore.busFeatureName] = function (item) {
                var p = item.GetData().properties;
                item.featureName = ITPACore.busFeatureName;
                item.lineItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.linesFeatureName, p.line_id);
                item.prevLineItem = item.lineItem;
            };
            ITPACore.addFeatureItemFunctions[ITPACore.stopsFeatureName] = function (item) {
                item.featureName = ITPACore.stopsFeatureName;
                item.nLines = 0;
                item.lines = {};
            };
            ITPACore.addFeatureItemFunctions[ITPACore.msgFeatureName] = function (item) {
                item.featureName = ITPACore.msgFeatureName;
            };
            ITPACore.addFeatureItemFunctions[ITPACore.incFeatureName] = function (item) {
                item.featureName = ITPACore.incFeatureName;
            };
            ITPACore.addFeatureItemFunctions[ITPACore.garFeatureName] = function (item) {
                item.featureName = ITPACore.garFeatureName;
            };
            ITPACore.addFeatureItemFunctions[ITPACore.occFeatureName] = function (item) {
                item.featureName = ITPACore.occFeatureName;
            };
            ITPACore.addFeatureItemFunctions[ITPACore.pkrecFeatureName] = function (item) {
                item.featureName = ITPACore.pkrecFeatureName;
            };
            ITPACore.addFeatureItemFunctions[ITPACore.ssgFeatureName] = function (item) {
                item.featureName = ITPACore.ssgFeatureName;
            };
            ITPACore.addFeatureItemFunctions[ITPACore.linesFeatureName] = function (item) {
                item.featureName = ITPACore.linesFeatureName;
                item.nBuses = 0;
                item.busList = {};
                item.busKeyList = {};
            };
            ITPACore.addFeatureItemFunctions[ITPACore.searchFeatureName] = function (item) {
                item.featureName = ITPACore.searchFeatureName;
            };
            ITPACore.addFeatureItemFunctions[ITPACore.directionsFeatureName] = function (item) {
                item.featureName = ITPACore.directionsFeatureName;
            };
            ITPACore.addFeatureItemFunctions[ITPACore.etaFeatureName] = function (item) {
                item.featureName = ITPACore.etaFeatureName;
            };
        }
        return ITPACore.addFeatureItemFunctions[featureName];
    },

    DirNameAbrevs: { 'eastbound': 'EB', 'westbound': 'WB', 'northbound': 'NB', 'southbound': 'SB', 'clockwise': 'CW', 'counterclockwise': 'CC', 'loop': 'LP' },

    AbbreviateDirection: function (dirName) {
        var dirNameUse = tf.js.GetNonEmptyString(dirName, "").toLowerCase();
        var abrev = ITPACore.DirNameAbrevs[dirNameUse];
        return abrev ? abrev : '??';
    },

    delFeatureItemFunctions: undefined,

    GetDelFeatureItemFunction: function (featureName) {
        if (ITPACore.delFeatureItemFunctions == undefined) {
            ITPACore.delFeatureItemFunctions = {};

            ITPACore.delFeatureItemFunctions[ITPACore.busFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.stopsFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.msgFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.incFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.garFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.occFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.pkrecFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.ssgFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.linesFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.searchFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.directionsFeatureName] = function (item) {
            };
            ITPACore.delFeatureItemFunctions[ITPACore.etaFeatureName] = function (item) {
            };
        }
        return ITPACore.delFeatureItemFunctions[featureName];
    },

    GetETABriefMessage: function (etaList) {
        var nextStr;
        if (etaList != undefined) {
            var count = etaList.count;
            var isOne = count == 1;
            var name = etaList.etaDestItemFeature == ITPACore.stopsFeatureName ? (isOne ? "bus" : "buses") : (isOne ? "stop" : "stops");
            nextStr = count + ' ' + name;
        }
        else { nextStr = "---"; }
        return nextStr;
    },

    GetHeadingIcon: function (heading) {
        var headingIcon = '<i class="itpa-up-arrow-icon iconInCardText"';
        heading = tf.js.GetFloatNumber(heading);
        var styles = tf.GetStyles();
        var transformStr = styles.GetSupportedTransformProperty();
        var rotateStr = styles.GetRotateByDegreeTransformStr(heading);
        headingIcon += ' style="' + transformStr + ':' + rotateStr + ';width:1.2rem;"';
        return headingIcon + '></i>';
    },

    updateFeatureItemFunctions: undefined,

    utmaSWId: 15000,

    MakeNumberFrom: function (numberCandidate, maxNumber) {
        var result = undefined;
        try { result = parseInt(numberCandidate, 10); }
        catch (e) { result = undefined; }
        if (isNaN(result)) {
            var len = numberCandidate.length, mult = 1;
            result = 0;
            for (var i = len - 1; i >= 0; --i, mult *= 26) {

                result += numberCandidate.charCodeAt(i) * mult;
            }
        }
        return result % maxNumber;
    },

    GetUpdateFeatureItemFunction: function (featureName) {
        if (ITPACore.updateFeatureItemFunctions == undefined) {
            ITPACore.updateFeatureItemFunctions = {};

            ITPACore.updateFeatureItemFunctions[ITPACore.busFeatureName] = function (item) {
                //{"datetime":"2016-05-24 03:04:57.0","heading":"0","line_id":"12","public_transport_vehicle_id":"4011155","speed":"0.0"}}
                //item.featureName = ITPACore.busFeatureName;
                var p = item.GetData().properties;

                item.lineItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.linesFeatureName, p.line_id);
                var lineP = item.lineItem ? item.lineItem.GetData().properties : undefined;
                item.lineId = p.line_id;
                item.fleet = p.fleet.toUpperCase();

                if (lineP) {
                    if (item.fleet == 'FIU') {
                        var lowerName = lineP.name.toLowerCase();
                        item.lineStr = (lowerName.indexOf('cats') >= 0) ? 'CATS' : 'GPE';
                    }
                    else {
                        item.lineStr = lineP.fleet_id.slice(-4);
                    }
                    item.lineColor = lineP.color;
                }
                else {
                    item.lineColor = "#fff";
                    item.lineStr = "?";
                }

                var etaCount = item.etaList ? item.etaList.etas.length : 0;
                var dateTimeMsg = ITPACore.getAmPmHourWithSecs(p.datetime);
                item.heading = tf.js.GetFloatNumber(p.heading);
                item.fleet_id = p.name;
                item.title = p.name;
                var cardTitle = p.name + ' - ' + etaCount;
                item.etaCount = etaCount;
                item.hasETAs = !!etaCount;
                var speed = p.speed !== undefined ? p.speed.toFixed(0) : 0;
                item.msg = p.direction + '<br>' + (speed != 0 ? + speed + 'mph' : 'idle');
                item.cardTitle = cardTitle;
                item.cardMsg = dateTimeMsg;
                item.order = p.order;
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.stopsFeatureName] = function (item) {
                //{"identifier":"SW 107 AV@# 917 (NTW TIRE)","platform_id":"525"}
                //item.featureName = ITPACore.stopsFeatureName;
                var p = item.GetData().properties;
                item.title = p.identifier;
                item.msg = ITPACore.GetETABriefMessage(item.etaList);
                item.cardTitle = item.title;
                item.cardMsg = item.msg;
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.msgFeatureName] = function (item) {
                //item.featureName = ITPACore.msgFeatureName;
                var p = item.GetData().properties;
                item.title = !!p.message ? p.message.toUpperCase() : "Unidentified message";
                item.msg = p.message_board_location;
                item.longTitle = item.title;
                //item.timeStamp = ITPACore.getMonthDay(p.update_time) + ' ' + ITPACore.getAmPmHour(p.update_time);
                var len = item.title.length;
                var maxlenTitle = 16;
                var maxlenMsg = 18;
                if (len > maxlenTitle && len > item.msg.length) {
                    item.title = item.title.substring(0, maxlenTitle) + '...';
                }
                item.cardTitle = item.title;
                item.cardMsg = item.msg;
                if (item.cardMsg.length > maxlenMsg) {
                    item.cardMsg = item.cardMsg.substring(0, maxlenMsg) + '...';
                }
                //item.order = p.message_board_id;
                item.order = item.title;
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.incFeatureName] = function (item) {
                //item.featureName = ITPACore.incFeatureName;
                var p = item.GetData().properties;
                item.msg = 'ongoing';
                if (!!p.external_incident_type) {
                    item.title = p.external_incident_type;
                    /*if (!!p.dispatch_time) {
                        if (!!p.arrival_time) { item.msg = 'arrival @ ' + ITPACore.getAmPmHour(p.arrival_time); }
                        else { item.msg = 'dispatch @ ' + ITPACore.getAmPmHour(p.dispatch_time); }
                    }*/
                }
                else { item.title = "Unidentified Incident"; }
                item.cardTitle = item.title;
                item.cardMsg = item.msg;
                if (tf.js.GetIsNonEmptyString(p.remarks)) {
                    //item.msg = p.remarks + '<br/>' + item.msg;
                    //item.msg = p.remarks;
                    item.msg = item.cardMsg = p.remarks;
                }
                else { item.msg = ""; }
                item.order = item.title;
                //item.order = p.event_id;
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.garFeatureName] = function (item) {
                //item.featureName = ITPACore.garFeatureName;
                var p = item.GetData().properties;
                var hasOccupancy = false;
                if (item.occupancyItem == undefined) { item.occupancyItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.occFeatureName, item.GetKey()); }
                item.title = p.identifier;
                var op;
                if (!!item.occupancyItem) {
                    op = item.occupancyItem.GetData().properties;
                    if (op.available_percentage_str != undefined) {
                        var ocp = op.available_01;
                        var ocpColor = ITPACore.GetColorForOccupancy01(ocp);
                        item.msgPlain = op.available_percentage_str + ' Available';
                        item.msg = '<span class="pkAvail-span" style="background-color:' + ocpColor + '">' + op.available_percentage_str + ' Available' + '</span><br/>';
                        item.occupancyColor = ocpColor;
                        hasOccupancy = true;
                    }
                }

                if (!hasOccupancy) {
                    item.msg = p.capacity + ' spaces';
                    item.occupancyColor = ITPACore.occupancyUnknownColor;
                    item.msgPlain = item.msg;
                }

                /*
                item.occupancyColor = ITPACore.GetColorForOccupancy01(1);
                item.msg = p.capacity + ' spaces';
                */
                item.cardTitle = item.title;
                item.cardMsg = item.msgPlain;
                item.order = p.parking_site_id;

                if (hasOccupancy) {
                    for (var i in op.items) {
                        var opItem = op.items[i]
                        var ocpColor = ITPACore.GetColorForOccupancy01(opItem.available_01);
                        var thisDecalStr = '<span class="pkAvail-span" style="background-color:' + ocpColor + '">' + opItem.available_percentage_str + ' ' + opItem.decalGroup + '</span> ';
                        item.msg += thisDecalStr;
                    }
                }

                if (item.pkRecommendations != undefined) {
                    var pkRec = item.pkRecommendations;
                    var recDecals = !!pkRec ? pkRec.decals : undefined;
                    var hasRecommendations = !!recDecals;

                    if (hasRecommendations) {
                        var decalMap = ITPACore.pkRecommendationsDecalMap;
                        if (decalMap != undefined) {
                            var allHTML = "<br/>Recommended parking areas:<br/>";
                            var foundOneRecommendation = false;
                            for (var i in recDecals) {

                                var r = recDecals[i];
                                var decal = decalMap[r.id + ''];
                                if (!!decal) {
                                    var area = r.area;
                                    var recStr = decal.name + ': ';
                                    if (!!area) {
                                        recStr += 'Level ' + area.level.level + ' - ' + area.label;
                                        foundOneRecommendation = true;
                                    }
                                    else {
                                        //recStr += 'none';
                                        continue;
                                    }

                                    var thisHTML = '<span class="pkRec-span">' + recStr + '</span> ';

                                    allHTML += thisHTML;
                                }
                            }
                            if (foundOneRecommendation) {
                                item.msg += allHTML;
                            }
                        }
                    }
                }
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.occFeatureName] = function (item) {
                //item.featureName = ITPACore.occFeatureName;
                if (item.garageItem == undefined) { item.garageItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.garFeatureName, item.GetKey()); }
                if (!!item.garageItem) { ITPACore.updateFeatureItemFunctions[ITPACore.garFeatureName](item.garageItem); }
                item.cardTitle = item.title;
                item.cardMsg = item.msg;
                //item.order = p.parking_site_id;
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.pkrecFeatureName] = function (item) {
                console.log('updateFeatureItemFunctions for pk rec');
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.ssgFeatureName] = function (item) {
                item.cardTitle = "";
                item.cardMsg = "";
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.linesFeatureName] = function (item) {
                //{"identifier":"GPE_PALMETTO_MMC_BBC","color":"#b78400","line_number":"1","platform_ids":[8,7,9],"line_id":"16"}}
                //item.featureName = ITPACore.linesFeatureName;
                /*if (item.nBuses == undefined) {
                    item.nBuses = 0;
                    item.busList = {};
                    item.busKeyList = {};
                }*/
                var d = item.GetData();
                var p = d.properties;
                var title = p.fleet_id.substring(p.fleet_id.length - 4) + ' ' + p.identifier;
                item.order = d.order;
                item.lineColor = p.color;
                item.title = title;
                //item.title = item.order + '';
                p.direction = '';
                var nDirections = p.direction_names.length;
                for (var i = 0; i < nDirections; ++i) {
                    if (i > 0) { p.direction += ' | '; }
                    p.direction += ITPACore.AbbreviateDirection(p.direction_names[i]);
                }
                item.msg = p.direction.toUpperCase();
                item.cardTitle = item.title;
                item.cardMsg = item.msg;
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.searchFeatureName] = function (item) {
                //item.featureName = ITPACore.searchFeatureName;
                var d = item.GetData();
                var p = d.properties;
                item.order = d.order;
                item.title = p.Display_Label;
                item.msg = p.Display_Summary_Short_Text;
                item.link = undefined;
                if (tf.js.GetIsNonEmptyString(p.detailquery)) {
                    //p.detailquery = "http://cnn.com";
                    item.link = ITPACore.CreateVisitWebSiteLink(p.detailquery, undefined, true);
                    //item.link = ITPACore.CreateVisitWebSiteLink(p.detailquery, "console.log('here');", true);
                }
                item.cardTitle = item.title;
                item.cardMsg = item.msg;
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.directionsFeatureName] = function (item) {
                var d = item.GetData();
                var p = d.properties;
                //lengthMeters, timeInSeconds
                //p.lengthMeters;
                //p.timeInSeconds;
                item.order = d.order;
                var displayLen = ITPACore.GetDisplayLength(p.lengthMeters);
                var displayTime = ITPACore.GetDisplayTime(p.timeInSeconds);
                var strMore = "";
                if (!!displayLen || !!displayTime) {
                    strMore = "(";
                    if (!!displayLen) { strMore += displayLen; }
                    if (!!displayLen && !!displayTime) { strMore += ' '; }
                    if (!!displayTime) { strMore += displayTime; }
                    strMore += ")";
                }
                var title = (d.order + 1) + '-' + p.instruction + strMore;
                item.title = title;
                item.msg = p.streetName;
                item.cardTitle = title;
                item.cardMsg = item.msg;
                item.isBusDirection = d.isBusDirection;
            };
            ITPACore.updateFeatureItemFunctions[ITPACore.etaFeatureName] = function (item) {
            };
        }
        return ITPACore.updateFeatureItemFunctions[featureName];
    },

    GetDisplayLength: function (lengthInMeters) {
        var str = "";
        if (lengthInMeters > 0) {
            var lengthInFeet = lengthInMeters * 3.28084;
            if (lengthInFeet > 1000) {
                var feetInMile = 5280, miles = lengthInFeet / feetInMile;
                str = miles.toFixed(1) + 'mi';
            }
            else {
                str = lengthInFeet.toFixed(0) + 'ft';
            }
        }
        return str;
    },

    GetDisplayTime: function (timeInSeconds) {
        var str = "";
        if (timeInSeconds > 0) {
            var minutes = timeInSeconds / 60;
            if (minutes >= 1) {
                var hours = minutes / 60;
                if (hours >= 1) { str = hours.toFixed(1) + 'h'; }
                else { str = minutes.toFixed(0) + 'm'; }
            }
            else { str = timeInSeconds + 's'; }
        }
        return str;
    },

    GetIsDismissedMessage: function (message) {
        if (ITPACore.dismissMessages == undefined) { ITPACore.LoadDismissMessages(); }
        return tf.js.GetIsNonEmptyString(message) ? ITPACore.dismissMessages.indexOf(message.toLowerCase()) >= 0 : false;
    },

    GetFeaturePreProcessServiceData: function (featureName) {
        if (ITPACore.featurePreProcessServiceData == undefined) {
            ITPACore.featurePreProcessServiceData = {};
            ITPACore.featurePreProcessServiceData[ITPACore.directionsFeatureName] = function (data) {
                // this function is not actually called, processing is done in directionscontrol.js
                var data = ITPACore.getFeatureListFromData(data);
                return data;
                //return ITPACore.getFeatureListFromData(data);
            };
            ITPACore.featurePreProcessServiceData[ITPACore.busFeatureName] = function (data) {
                ITPACore.useBusFullUpdate = ITPACore.needBusFullUpdate;
                ITPACore.needBusFullUpdate = false;
                data = ITPACore.getFeatureListFromData(data);
                return data;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.msgFeatureName] = function (data) {
                var data = ITPACore.getFeatureListFromData(data);
                if (!!data) {
                    var filteredData = [];

                    for (var i in data) {
                        var d = data[i], p = d.properties;
                        var message = p.message;
                        if (ITPACore.GetIsDismissedMessage(message)) {
                            //console.log('dismissed message: ' + message);
                        }
                        else {
                            p.isFarFromDirections = ITPACore.GetIsFilteringMsgForDistance() ? ITPACore.GetIsFarFromDirections(d.geometry.coordinates) : false;
                            filteredData.push(d);
                        }
                    }
                    data = filteredData;
                }
                return data;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.incFeatureName] = function (data) {
                var data = ITPACore.getFeatureListFromData(data);
                if (!!data) {
                    for (var i in data) {
                        var d = data[i];
                        d.properties.isFarFromDirections = ITPACore.GetIsFilteringIncForDistance() ? ITPACore.GetIsFarFromDirections(d.geometry.coordinates) : false;
                    }
                }
                return data;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.garFeatureName] = function (data) {
                var data = ITPACore.getFeatureListFromData(data);
                return data;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.occFeatureName] = function (data) {
                var newData = [], newDataById = {};
                var garList = !!ITPACore.featureLayers ? ITPACore.featureLayers.GetKeyedList(ITPACore.garFeatureName) : undefined;

                if (!!garList) {
                    var garItems = garList.GetKeyedItemList();
                    for (var i in garItems) {
                        var garItem = garItems[i], gard = garItem.GetData(), garg = gard.geometry, garp = gard.properties;
                        var occItem = {
                            properties: {
                                garageItem: garItem,
                                parking_site_id: garp.parking_site_id,
                                identifier: garp.identifier,
                                available_01: undefined,
                                available_percentage_str: undefined,
                                available: 0,
                                total: 0,
                                items: []
                            },
                            geometry: {
                                type: 'point',
                                coordinates: garp.centroid
                            }
                        }
                        newDataById['' + occItem.properties.parking_site_id] = occItem;
                        newData.push(occItem);
                    }
                }

                var garItemsToUpdate = {}, ngarItemsToUpdate = 0;

                data = data ? data.data : undefined;

                for (var i in data) {
                    var d = data[i], id = d.site_id, idk = '' + id;
                    var occData = newDataById[idk];
                    if (!!occData) {
                        var occp = occData.properties;
                        occp.total += d.total;
                        occp.available += d.available;
                        occp.available_01 = occp.total > 0 ? occp.available / occp.total : 0;
                        //occp.available_01 = Math.random();
                        occp.available_percentage_str = ITPACore.GetPercentStrFrom01(occp.available_01);
                        var group_available_01 = d.total > 0 ? d.available / d.total : 0;
                        occp.items.push({ decalGroup: d.decalgroup, total: d.total, available: d.available, available_01: group_available_01, available_percentage_str: ITPACore.GetPercentStrFrom01(group_available_01) });
                        var garKey = '' + occp.parking_site_id;
                        if (garItemsToUpdate[garKey] == undefined) {
                            garItemsToUpdate[garKey] = occp.garageItem;
                            ++ngarItemsToUpdate;
                        }
                    }
                }

                if (ngarItemsToUpdate > 0) {
                    setTimeout(function () {
                        for (var i in garItemsToUpdate) {
                            garItemsToUpdate[i].NotifyUpdated();
                        }
                    }, 200);
                }

                return newData;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.pkrecFeatureName] = function (data) {
                var newData = [], newDataById = {};

                data = data ? data.data : undefined;

                var garList = !!ITPACore.featureLayers ? ITPACore.featureLayers.GetKeyedList(ITPACore.garFeatureName) : undefined;

                if (!!garList) {

                    var garItems = garList.GetKeyedItemList();
                    for (var i in garItems) { garItems[i].pkRecommendations = undefined; }

                    if (tf.js.GetIsNonEmptyArray(data)) {
                        for (var i in data) {
                            var d = data[i];
                            var site = d.site;
                            var siteId = site.id;
                            var decal = d.decal;
                            var decalId = decal.id;
                            var area = d.area;
                            var key = siteId + '';
                            var decalKey = decalId + '';
                            var existingItem = newDataById[key];

                            if (existingItem == undefined) {
                                var garItem = garList.GetItem(siteId);
                                if (!!garItem) {
                                    newDataById[key] = existingItem = {
                                        garItem: garItem,
                                        key: key,
                                        siteId: siteId,
                                        decals: {}
                                    };
                                }
                                //else { console.log('recommendation for unknown parking site id: ' + siteId); }
                            }
                            if (!!existingItem) {
                                existingItem.decals[decalKey] = {
                                    key: decalKey,
                                    id: decalId,
                                    area: area
                                };
                            }
                        }
                        for (var i in newDataById) {
                            var nd = newDataById[i];
                            nd.garItem.pkRecommendations = nd;
                            newData.push(nd);
                        }
                    }
                }
                return newData;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.ssgFeatureName] = function (data) {
                if (!!data) {
                    if (tf.js.GetIsNonEmptyArray(data.blocks)) {
                        var newData = [];
                        var occupancyColors = ITPACore.occupancyColors;
                        var nMultiLines = occupancyColors.length, nColors = nMultiLines - 1;
                        var multiLineCoords = new Array(nMultiLines);

                        data = data.blocks;

                        for (var i in data) {
                            var block = data[i];
                            var colorIndex = tf.js.NumberClip(tf.js.GetFloatNumber(block.realTimeProbability, 1), 0, 1);
                            var node1Coords = [block.node1.lng, block.node1.lat];
                            var node2Coords = [block.node2.lng, block.node2.lat];

                            colorIndex = Math.floor(colorIndex * nColors);

                            if (multiLineCoords[colorIndex] == undefined) { multiLineCoords[colorIndex] = []; }
                            multiLineCoords[colorIndex].push([node1Coords, node2Coords]);
                        }

                        for (var i = 0; i < nMultiLines; ++i) {
                            var thisCoords = multiLineCoords[i];

                            if (thisCoords !== undefined) {
                                var properties = {
                                    realTimeProbability: i / 10, color_index: i, text: occupancyColors[i].text,
                                    color: occupancyColors[i].color, occupancyColors: occupancyColors
                                };
                                var geometry = { type: "multilinestring", coordinates: thisCoords };
                                var itemData = { properties: properties, geometry: geometry, type: "Feature" };
                                newData.push(itemData);
                            }
                        }
                        data = newData;
                    }
                    else { data = undefined; }
                }
                return data;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.stopsFeatureName] = function (data) {
                var data = ITPACore.getFeatureListFromData(data);
                return data;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.linesFeatureName] = function (data) {
                var data = tf.js.GetIsArray(data) ? data : undefined;
                if (!!data) {
                    for (var i in data) {
                        var d = data[i];
                        if (d.fleet == 'utma') { d.direction_names[0] = 'Loop'; }
                    }
                    data.sort(function (a, b) {
                        var pa = a.properties, pb = b.properties;
                        var fa = pa.fleet, fb = pb.fleet;

                        var fleet_names = ['utma', 'fiu'];

                        for (var i in fleet_names) {
                            var fn = fleet_names[i];
                            var fav = fa == fn ? '' : fa;
                            var fbv = fb == fn ? '' : fb;
                            if (fav < fbv) { return -1; } else if (fav > fbv) { return 1; }
                        }

                        var fia = parseInt(pa.id, 10);
                        var fib = parseInt(pb.id, 10);

                        return fia < fib ? -1 : 1;
                    });

                    var index = 0;
                    for (var i in data) {
                        data[i].order = index++;
                    }
                }
                return data;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.searchFeatureName] = function (data) {
                var data = ITPACore.getFeatureListFromData(data);
                var order = 0;
                for (var i in data) { data[i].order = order++; }
                //console.log('pre processing search data');
                return data;
            };
            ITPACore.featurePreProcessServiceData[ITPACore.etaFeatureName] = function (data) {
                //var data = tf.js.GetIsArray(data) ? data : undefined;
                var data = tf.js.GetIsValidObject(data) && tf.js.GetIsArray(data.data) ? data.data : undefined;
                return data;
            };
        }
        return ITPACore.featurePreProcessServiceData[featureName];
    },

    UpdateKeyedItemsForDistanceToRouteFeature: function (kl, doNotFilter) {
        if (!!kl) {
            var keyedItems = kl.GetKeyedItemList();
            for (var i in keyedItems) {
                var item = keyedItems[i];
                var data = item.GetData(), p = data.properties;
                var wasFar = p.isFarFromDirections;
                var isFar = !!doNotFilter ? false : ITPACore.GetIsFarFromDirections(data.geometry.coordinates);
                p.isFarFromDirections = isFar;
                if (isFar != wasFar) {
                    var mapFeature = ITPACore.featureLayers.GetMapFeatureFromItem(item);
                    //console.log('changing map feature to: ' + (isFar ? 'FAR' : 'NEAR'));
                    if (mapFeature) {
                        mapFeature.RefreshStyle();
                    }
                    else {
                        //console.log('missing map feature');
                    }
                }
            }
        }
    },

    GetIsFarFromDirections: function (pointCoords) {
        var isFar = false;
        if (!!ITPACore.directionsRouteFeature) {
            var routeFeatures = !tf.js.GetIsArray(ITPACore.directionsRouteFeature) ? [ITPACore.directionsRouteFeature] : ITPACore.directionsRouteFeature;
            var nRouteFeatures = routeFeatures.length;
            var isNear = false;
            for (var i = 0; i < nRouteFeatures && !isNear; ++i) {
                var routeFeature = routeFeatures[i];
                var closestPoint = routeFeature.GetClosestPoint(pointCoords);
                var distance = tf.units.GetDistanceInMetersBetweenMapCoords(closestPoint, pointCoords);
                isNear = distance < ITPACore.minDistanceInMetersToBeFarFromDirections;
            }
            isFar = !isNear;
        }
        return isFar;
    },

    GetFeatureFilterAddItems: function (featureName) {
        if (ITPACore.featureFilterAddItems == undefined) {
            ITPACore.featureFilterAddItems = {};
            ITPACore.featureFilterAddItems[ITPACore.busFeatureName] = function (itemData) {

                /*var lastUpdated = tf.js.GetDateFromTimeStamp(itemData.properties.datetime);
                var updatedInterval = Date.now() - lastUpdated;
                var daysForStale = 2;
                var millisForDay = 24 * 60 * 60 * 1000;
                //var isNotStale = updatedInterval < daysForStale * millisForDay;
                var isNotStale = true;
                //var isInsideExtent = ITPACore.IsMapPointFeatureInsideExtent(itemData);
                var isInsideExtent = true;
                var add = isNotStale && isInsideExtent;
                if (!isNotStale) {
                    //console.log('stale bus discarded');
                }
                //if (!add) { console.log('BUS outside');}
                return add;*/


                var p = itemData.properties;
                p.prevHeadingInt = p.headingInt = Math.round(p.heading);
                p.prevHasETAs = p.hasETAs = false;
                p.headingRad = p.headingInt * Math.PI / 180.0;

                //if (item.prevHeadingInt == undefined) { item.prevHeadingInt = item.headingInt; }
                //item.headingRad = item.headingInt * Math.PI / 180.0

                return true;
            };
            ITPACore.featureFilterAddItems[ITPACore.msgFeatureName] = function (itemData) {
                //var add = ITPACore.IsMapPointFeatureInsideExtent(itemData);
                //return add;
                return true;
            };
            ITPACore.featureFilterAddItems[ITPACore.incFeatureName] = function (itemData) {
                //var add = ITPACore.IsMapPointFeatureInsideExtent(itemData);
                //return add;
                return true;
            };
            ITPACore.featureFilterAddItems[ITPACore.garFeatureName] = function (itemData) {
                return true;
            };
            ITPACore.featureFilterAddItems[ITPACore.occFeatureName] = function (itemData) {
                /*if (ITPACore.mmcParkingSiteIDs.indexOf(parseInt(itemData.properties.parking_site_id, 10)) >= 0) {
                    return true;
                }
                return false;*/
                return true;
            };
            ITPACore.featureFilterAddItems[ITPACore.pkrecFeatureName] = function (itemData) {
                return true;
            };
            ITPACore.featureFilterAddItems[ITPACore.ssgFeatureName] = function (itemData) {
                return true;
            };
            ITPACore.featureFilterAddItems[ITPACore.stopsFeatureName] = function (itemData) {
                var add = true;
                return add;
            };
            ITPACore.featureFilterAddItems[ITPACore.linesFeatureName] = function (itemData) {
                //{"identifier":"GPE_PALMETTO_MMC_BBC","color":"#b78400","line_number":"1","platform_ids":[8,7,9],"line_id":"16"}}
                var add = true;
                return add;
            };
            ITPACore.featureFilterAddItems[ITPACore.searchFeatureName] = function (itemData) {
                //var add = ITPACore.IsMapPointFeatureInsideExtent(itemData);
                //if (!add) { console.log('SEARCH outside'); }
                //return true;
                //return add;
                return true;
            };
            ITPACore.featureFilterAddItems[ITPACore.directionsFeatureName] = function (itemData) {
                return true;
            };
            ITPACore.featureFilterAddItems[ITPACore.etaFeatureName] = function (itemData) {
                /*var add;
                if (itemData.busItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.busFeatureName, itemData.public_transport_vehicle_id)) {
                    if (itemData.stopItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.stopsFeatureName, itemData.platform_id)) {
                        itemData.datetime = tf.js.GetDateFromTimeStamp(itemData.eta);
                        add = true;
                    }
                }
                return add;*/
                return true;
            };

        }
        return ITPACore.featureFilterAddItems[featureName];
    },

    minLevelBeforeUCFeature: 14,

    GetFeatureLayerMinMaxLevels: function (featureName) {
        if (ITPACore.featureLayerMinMaxLevels == undefined) {
            ITPACore.featureLayerMinMaxLevels = {};

            ITPACore.featureLayerMinMaxLevels[ITPACore.garFeatureName] = { minLevel: ITPACore.minLevelBeforeUCFeature, maxLevel: tf.consts.maxLevel };
            ITPACore.featureLayerMinMaxLevels[ITPACore.occFeatureName] = { minLevel: 16, maxLevel: tf.consts.maxLevel };
            ITPACore.featureLayerMinMaxLevels[ITPACore.ssgFeatureName] = { minLevel: ITPACore.minLevelBeforeUCFeature, maxLevel: tf.consts.maxLevel };
        }
        return ITPACore.featureLayerMinMaxLevels[featureName];
    },

    GetFeatureRefreshStyleOnUpdate: function (featureName) {
        if (ITPACore.featureRefreshStyleOnUpdate == undefined) {
            ITPACore.featureRefreshStyleOnUpdate = {};
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.busFeatureName] = true;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.msgFeatureName] = true;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.incFeatureName] = true;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.garFeatureName] = true;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.occFeatureName] = true;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.pkrecFeatureName] = false;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.stopsFeatureName] = true;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.linesFeatureName] = true;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.searchFeatureName] = false;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.directionsFeatureName] = false;
            ITPACore.featureRefreshStyleOnUpdate[ITPACore.etaFeatureName] = false;
        }
        return ITPACore.featureRefreshStyleOnUpdate[featureName];
    },

    GetExternalFeatureRefreshStyleOnUpdate: function (featureName) {
        if (ITPACore.externalFeatureRefreshStyleOnUpdate == undefined) {
            ITPACore.externalFeatureRefreshStyleOnUpdate = {};
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.busFeatureName] = undefined;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.msgFeatureName] = undefined;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.incFeatureName] = undefined;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.garFeatureName] = ITPACore.occFeatureName;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.occFeatureName] = ITPACore.garFeatureName;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.pkrecFeatureName] = undefined;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.ssgFeatureName] = undefined;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.stopsFeatureName] = undefined;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.linesFeatureName] = undefined;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.searchFeatureName] = undefined;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.directionsFeatureName] = undefined;
            ITPACore.externalFeatureRefreshStyleOnUpdate[ITPACore.etaFeatureName] = undefined;
        }
        return ITPACore.externalFeatureRefreshStyleOnUpdate[featureName];
    },

    GetGeoCodeFeatureStyleSpecs: function (withHover) {
        var scale = withHover ? 0.3 : 0.24, zindex = withHover ? 8 : 4;
        if (withHover) {
            var style = ITPACore.doGetPreloadedIconStyleSpecs(ITPACore.mapGeoCodeImagePreloaded, scale, [0.5, 1], zindex);
            var circleStyle = { circle: true, circle_radius: 6, shape_points: 4, fill: true, fill_color: "#eecc29", zindex: zindex + 1, line: true, line_color: "#213873", line_width: 2 };
            return [style, circleStyle];
        }
        return ITPACore.doGetPreloadedIconStyleSpecs(ITPACore.mapGeoCodeImagePreloaded, scale, [0.5, 1], zindex);
    },

    GetBBCFeatureStyle: function () {
        return [
            { shape: true, shape_radius: 16, shape_points: 5, fill: true, fill_color: "#fff", fill_opacity: 1, zindex: 1 },
            { icon: true, icon_url: "./img/bbcmapicon.svg", snapToPixel: false, icon_anchor: [0.5, 0.5], scale: 1.8, zindex: 2 }
        ]
    },

    GetUCFeatureStyle: function () {
        return [
            { shape: true, shape_radius: 16, shape_points: 5, fill: true, fill_color: "#fff", fill_opacity: 1, zindex: 1 },
            { icon: true, icon_url: "./img/ucmapicon.svg", snapToPixel: false, icon_anchor: [0.5, 0.5], scale: 1.8, zindex: 2 }
        ]
    },

    GetUserLocationFeatureStyle: function () {
        return [
            /*{ circle: true, circle_radius: 20, fill: true, fill_color: "#fff", fill_opacity: 1, zindex: 1 }*/,
            { icon: true, icon_url: "./img/user position.svg", snapToPixel: false, scale: 1.5, zindex: 2 }
        ]
    },

    mapBusGOImagePreloaded: undefined,
    mapBusROImagePreloaded: undefined,
    mapBusBOImagePreloaded: undefined,
    mapDirectionImagePreloaded: undefined,
    mapIncImagePreloaded: undefined,
    mapIncSelImagePreloaded: undefined,
    mapMsgImagePreloaded: undefined,
    mapStopImagePreloaded: undefined,
    mapSearchImagePreloaded: undefined,
    mapGeoCodeImagePreloaded: undefined,
    mapDirectionsImagePreloaded: undefined,

    PreloadImages: function (callBack, scope) {
        if (ITPACore.mapMsgImagePreloaded == undefined) {
            ITPACore.mapMsgImagePreloaded = null;
            new tf.dom.ImgsPreLoader({
                imgSrcs: [

                    "./img/busGreenOsm.png",
                    "./img/busRedOsm.png",
                    "./img/busBlueOsm.png",

                    "./img/directionsm.png",

                    "./img/inc.png",
                    "./img/msgbd on.png",
                    "./img/stop.png",
                    "./img/mapPinBlue.png",
                    "./img/mapPinBlueLight.png",
                    "./img/incSel.png",
                    "./img/directionDir.png"
                ],
                onAllLoaded: function (ipl) {
                    var imgs = ipl.GetImgs();
                    var index = 0;
                    ITPACore.mapBusGOImagePreloaded = imgs[index++];
                    ITPACore.mapBusROImagePreloaded = imgs[index++];
                    ITPACore.mapBusBOImagePreloaded = imgs[index++];

                    ITPACore.mapDirectionImagePreloaded = imgs[index++];

                    ITPACore.mapIncImagePreloaded = imgs[index++];
                    ITPACore.mapMsgImagePreloaded = imgs[index++];
                    ITPACore.mapStopImagePreloaded = imgs[index++];
                    ITPACore.mapSearchImagePreloaded = imgs[index++];
                    ITPACore.mapGeoCodeImagePreloaded = imgs[index++];
                    ITPACore.mapIncSelImagePreloaded = imgs[index++];
                    ITPACore.mapDirectionsImagePreloaded = imgs[index++];
                    if (!!(callBack = tf.js.GetFunctionOrNull(callBack))) { callBack.apply(scope); }
                }
            });
        }
    },

    doGetPreloadedIconStyleSpecs: function (preloadedIcon, iconScale, iconAnchor, iconZIndex, iconOpacity) {
        var style = {
            icon: true, icon_img: preloadedIcon.GetImg(), icon_size: preloadedIcon.GetDimensions(), icon_anchor: iconAnchor,
            scale: iconScale, zindex: iconZIndex,
            opacity: iconOpacity != undefined ? iconOpacity : 1
        };
        return style;
    },

    doGetPreloadedIconStyle: function (preloadedIcon, iconScale, iconAnchor, iconZIndex, iconOpacity) {
        //iconScale = iconScale == 1 ? 1.4 : 
        var style = ITPACore.doGetPreloadedIconStyleSpecs(preloadedIcon, iconScale, iconAnchor, iconZIndex, iconOpacity);
        return new tf.map.FeatureStyle(style);
    },

    doGetIconStyle: function (iconUrl, iconScale, iconAnchor, iconZIndex) {
        var style = [
            { icon: true, icon_url: iconUrl, icon_anchor: iconAnchor, scale: iconScale, zindex: iconZIndex, snaptopixel: false }
        ];
        return new tf.map.FeatureStyle(style);
    },

    busStyleCache: {},

    busFeatureStyle: undefined, busFeatureHoverStyle: undefined,
    doGetBusStyle: function (item, withHover) {
        var scale = withHover ? 0.9 : 0.75;
        var scaleD = scale * 0.85;
        var zindex = withHover ? 3 : 1;
        var p = item.GetData().properties;
        var hasETAs = p.hasETAs;
        var cacheKey = "";

        if (withHover) { cacheKey += 'h-'; } else { cacheKey += 's-'; }
        if (hasETAs) { cacheKey += 'y-'; } else { cacheKey += 'n-'; }
        cacheKey += '' + p.headingInt;

        var cachedStyle = ITPACore.busStyleCache[cacheKey];

        if (!cachedStyle) {
            //console.log('bs for: ' + cacheKey);
            var imgOutline;
            if (hasETAs) { zindex++; imgOutline = ITPACore.mapBusBOImagePreloaded; }
            else { imgOutline = ITPACore.mapBusROImagePreloaded; }
            var style = ITPACore.doGetPreloadedIconStyleSpecs(imgOutline, scale, [0.5, 0.45], zindex);
            var dirStyle = ITPACore.doGetPreloadedIconStyleSpecs(ITPACore.mapDirectionImagePreloaded, scaleD, [0.5, 0.5], zindex + 1);
            dirStyle.rotation_rad = p.headingRad;
            dirStyle.rotate_with_map = true;
            ITPACore.busStyleCache[cacheKey] = cachedStyle = new tf.map.FeatureStyle([style, dirStyle]);
        } //else { console.log('skipping bs creation'); }
        return cachedStyle;
    },

    dimOpacity: 0.15,

    msgFeatureStyle: undefined, msgFeatureHoverStyle: undefined, msgFeatureDimStyle: undefined,
    doGetMsgStyle: function (withHover, isDim) {
        var scale = withHover ? 0.3 : (isDim ? 0.18 : 0.24), zindex = withHover ? 3 : 1;
        var opacity = isDim ? ITPACore.dimOpacity : 1;
        if (withHover) {
            var style = ITPACore.doGetPreloadedIconStyleSpecs(ITPACore.mapMsgImagePreloaded, scale, [0, 1], zindex, opacity);
            var circleStyle = {
                circle: true, circle_radius: 6, shape_points: 4, fill: true, fill_color: "#ffc900", zindex: zindex + 1, line: true,
                line_color: "#000", line_width: 2
            };
            return new tf.map.FeatureStyle([style, circleStyle]);
        }
        return ITPACore.doGetPreloadedIconStyle(ITPACore.mapMsgImagePreloaded, scale, [0, 1], zindex, opacity);
    },

    incFeatureStyle: undefined, incFeatureHoverStyle: undefined, incFeatureDimStyle: undefined,
    doGetIncStyle: function (withHover, isDim) {
        var scale = withHover ? 0.4 : (isDim ? 0.24 : 0.3), zindex = withHover ? 3 : 1;
        var opacity = isDim ? ITPACore.dimOpacity : 1;
        return ITPACore.doGetPreloadedIconStyle(withHover ? ITPACore.mapIncSelImagePreloaded : ITPACore.mapIncImagePreloaded, scale, [0.5, 0.5], zindex, opacity);
    },

    stopsFeatureStyle: undefined, stopsFeatureHoverStyle: undefined,
    doGetStopsStyle: function (withHover) {
        var scale = withHover ? 1.4 : 1.1, zindex = withHover ? 3 : 1;
        return ITPACore.doGetPreloadedIconStyle(ITPACore.mapStopImagePreloaded, scale, [0.5, 0.5], zindex);
    },

    searchFeatureStyle: undefined, searchFeatureHoverStyle: undefined,
    doGetSearchStyle: function (withHover) {
        var scale = withHover ? 0.3 : 0.24, zindex = withHover ? 3 : 1;
        if (withHover) {
            var style = ITPACore.doGetPreloadedIconStyleSpecs(ITPACore.mapSearchImagePreloaded, scale, [0.5, 1], zindex);
            var circleStyle = { circle: true, circle_radius: 6, shape_points: 4, fill: true, fill_color: "#eecc29", zindex: zindex + 1, line: true, line_color: "#213873", line_width: 2 };
            return new tf.map.FeatureStyle([style, circleStyle]);
        }
        return ITPACore.doGetPreloadedIconStyle(ITPACore.mapSearchImagePreloaded, scale, [0.5, 1], zindex);
    },

    directionsFeatureStyle: undefined, directionsFeatureHoverStyle: undefined,
    doGetDirectionsStyle: function (item, withHover) {
        var scale = withHover ? 1 : 0.8, zindex = withHover ? 10 : 9;
        var circleStyle = { circle: true, circle_radius: 16, fill: true, fill_opacity: 30, fill_color: "#fff", zindex: zindex - 1, line: true, line_color: "#213873", line_width: 1, line_opacity: 50 };
        var style = ITPACore.doGetPreloadedIconStyleSpecs(ITPACore.mapDirectionsImagePreloaded, scale, [0.5, 0.5], zindex);
        var angle = item.GetData().properties.postTurnDirection * Math.PI / 180;
        style.rotation_rad = angle;
        style.rotate_with_map = true;
        return new tf.map.FeatureStyle([circleStyle, style]);
    },

    GetFeatureStyle: function (featureName) {
        if (ITPACore.featureStyles == undefined) {
            ITPACore.featureStyles = {};
            ITPACore.featureStyles[ITPACore.busFeatureName] = function getBusStyle(mapFeature, item, isHover) {
                ITPACore.busFeatureStyle = ITPACore.doGetBusStyle(item, false);
                ITPACore.busFeatureHoverStyle = ITPACore.doGetBusStyle(item, true);
                return isHover ? ITPACore.busFeatureHoverStyle : ITPACore.busFeatureStyle;
            };
            ITPACore.featureStyles[ITPACore.msgFeatureName] = function getMsgStyle(mapFeature, item, isHover) {
                return isHover ? ITPACore.doGetMsgStyle(true, false) :
                    (item.GetData().properties.isFarFromDirections ? ITPACore.doGetMsgStyle(false, true) : ITPACore.doGetMsgStyle(false, false));
            }
            ITPACore.featureStyles[ITPACore.incFeatureName] = function getStyle(mapFeature, item, isHover) {
                return isHover ? ITPACore.doGetIncStyle(true, false) :
                    (item.GetData().properties.isFarFromDirections ? ITPACore.doGetIncStyle(false, true) : ITPACore.doGetIncStyle(false, false));
            };
            ITPACore.featureStyles[ITPACore.stopsFeatureName] = function getStyle(mapFeature, item, isHover) {
                if (ITPACore.stopsFeatureStyle == undefined) {
                    ITPACore.stopsFeatureStyle = ITPACore.doGetStopsStyle(false);
                    ITPACore.stopsFeatureHoverStyle = ITPACore.doGetStopsStyle(true);
                }
                return isHover ? ITPACore.stopsFeatureHoverStyle : ITPACore.stopsFeatureStyle;
            };
            ITPACore.featureStyles[ITPACore.garFeatureName] = function getStyle(mapFeature, item, isHover) {
                var fillColor;
                var key = item.GetKey();
                var occItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.occFeatureName, item.GetKey());
                var hasOccupancy = false;
                if (occItem) {
                    var occData = occItem.GetData(), occp = occData.properties;
                    if (!!occp.available_percentage_str) {
                        hasOccupancy = true;
                        fillColor = ITPACore.GetColorForOccupancy01(occp.available_01);
                    }
                }
                if (!hasOccupancy) { fillColor = ITPACore.occupancyUnknownColor; }
                var lineOpacity = isHover ? 70 : 50, lineWidth = isHover ? 3 : 1, zIndex = isHover ? 3 : 1;
                return { line: true, line_color: "#00f", line_opacity: lineOpacity, line_width: lineWidth, fill: true, fill_color: fillColor, zindex: zIndex };
            };
            ITPACore.featureStyles[ITPACore.ssgFeatureName] = function getStyle(mapFeature, item, isHover) {
                var p = !!item ? item.GetData().properties : undefined;
                var line_color = !!p ? p.color : vacancyUnknownColor;
                var around_line_color = isHover ? "#000" : "#88a";
                var lineWidth = isHover ? 10 : 6;
                return [
                    { line: true, line_width: lineWidth + 4, line_color: around_line_color, zindex: 1, line_opacity: 70, line_dash: [20, 10] },
                    { line: true, line_width: lineWidth, line_color: line_color, line_opacity: 100, zindex: 2, line_dash: [20, 10] }
                ];
            };
            ITPACore.featureStyles[ITPACore.occFeatureName] = function getStyle(mapFeature, item, isHover) {
                var occData = item.GetData(), occp = occData.properties, font = "1rem arial", fillColor = "#fff", lineColor = "#000", lineWidth = 2;
                var garItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.garFeatureName, item.GetKey());
                var label = garItem ? garItem.GetData().properties.identifier.toLowerCase() : "";
                var lineWidth = isHover ? 2 : 1;
                var zindex = isHover ? 6 : 1;

                var marker_color = "#fff";

                if (occp.available_percentage_str != undefined) {
                    label += ' ' + occp.available_percentage_str;
                    marker_color = "#ffd";
                    zindex = isHover ? 7 : 2;
                }

                isHover = true;

                var markerOpacity = isHover ? 100 : 80;
                var baseStyle = {
                    marker_horpos: "center", marker_verpos: "center",
                    marker: true, label: label, font_height: isHover ? 18 : 15, zindex: zindex, marker_color: marker_color, font_color: isHover ? "#008" : "#008",
                    line_width: lineWidth, line_color: "#ffffff", marker_opacity: markerOpacity, border_opacity: 60, border_color: "#000"
                };
                return baseStyle;
            };
            ITPACore.featureStyles[ITPACore.linesFeatureName] = function getStyle(mapFeature, item, isHover) {
                var lineWidth = 3, zindex = isHover ? 5 : 1;
                var lineWidthTick = lineWidth * 2 + 1;
                var lineItemColor = item.GetData().properties.color;
                var style = { line: true, line_color: lineItemColor, line_width: lineWidth, zindex: zindex };
                if (isHover) { style.line_dash = [20, 20]; style.line_color = "#fff"; };
                return isHover ? [{ line: true, line_color: "#000", line_width: lineWidthTick + 2, zindex: 3 },
                { line: true, line_color: lineItemColor, line_width: lineWidthTick, zindex: 4 }, style] : style;
            }
            ITPACore.featureStyles[ITPACore.searchFeatureName] = function getStyle(mapFeature, item, isHover) {
                if (ITPACore.searchFeatureStyle == undefined) {
                    ITPACore.searchFeatureStyle = ITPACore.doGetSearchStyle(false);
                    ITPACore.searchFeatureHoverStyle = ITPACore.doGetSearchStyle(true);
                }

                return isHover ? ITPACore.searchFeatureHoverStyle : ITPACore.searchFeatureStyle;
            };
            ITPACore.featureStyles[ITPACore.directionsFeatureName] = function getStyle(mapFeature, item, isHover) {
                return ITPACore.doGetDirectionsStyle(item, isHover);
            };
        }
        return ITPACore.featureStyles[featureName];
    },

    RefreshMapFeatureStyle: function (item, mapFeature) {
        if (item.featureName == ITPACore.busFeatureName) {
            var d = item.GetData(), p = d.properties;
            p.hasETAs = item.etaCount > 0;
            p.headingInt = Math.round(p.heading);

            if (p.prevHadETAs != p.hasETAs || p.prevHeadingInt != p.headingInt) {
                p.headingRad = p.headingInt * Math.PI / 180.0;
                p.prevHadETAs = p.hasETAs;
                p.prevHeadingInt = p.headingInt;
                mapFeature.RefreshStyle();
            } //else { console.log('skipping bus map feature refresh'); }
        }
        else {
            mapFeature.RefreshStyle();
        }
    },

    needBusFullUpdate: false,
    useBusFullUpdate: false,

    GetNeedsUpdateItemData: function (featureName) {
        if (ITPACore.needsUpdateItemData == undefined) {
            ITPACore.needsUpdateItemData = {};

            ITPACore.needsUpdateItemData[ITPACore.busFeatureName] = function (updateObj) {
                if (ITPACore.useBusFullUpdate) { return true; }
                //return true;
                var coordsOld = updateObj.itemData.geometry.coordinates;
                var coordsNew = updateObj.itemDataSet.geometry.coordinates;
                var pOld = updateObj.itemData.properties;
                var pNew = updateObj.itemDataSet.properties;
                pOld.order = pNew.order;
                return coordsOld[0] != coordsNew[0] ||
                    coordsOld[1] != coordsNew[1] ||
                    pOld.name != pNew.name ||
                    pOld.line_id != pNew.line_id ||
                    pOld.datetime != pNew.datetime ||
                    pOld.heading != pNew.heading ||
                    pOld.number_of_occupants != pNew.number_of_occupants;
            };

            ITPACore.needsUpdateItemData[ITPACore.msgFeatureName] = function (updateObj) {
                var coordsOld = updateObj.itemData.geometry.coordinates;
                var coordsNew = updateObj.itemDataSet.geometry.coordinates;
                if (coordsOld[0] != coordsNew[0] || coordsOld[1] != coordsNew[1]) { return true; }
                var props = updateObj.itemData.properties;
                var newProps = updateObj.itemDataSet.properties;
                if (newProps.isFarFromDirections != props.isFarFromDirections) { return true; }
                return props.message != newProps.message;
            };

            ITPACore.needsUpdateItemData[ITPACore.incFeatureName] = function (updateObj) {
                /*var coordsOld = updateObj.itemData.geometry.coordinates;
                var coordsNew = updateObj.itemDataSet.geometry.coordinates;
                if (coordsOld[0] != coordsNew[0] || coordsOld[1] != coordsNew[1]) { return true; }
                return updateObj.itemData.properties.last_updated != updateObj.itemDataSet.properties.last_updated;*/
                var props = updateObj.itemData.properties;
                var newProps = updateObj.itemDataSet.properties;

                if (newProps.isFarFromDirections != props.isFarFromDirections) { return true; }

                var geomCoords = updateObj.itemData.geometry.coordinates;
                var newGeomCoords = updateObj.itemDataSet.geometry.coordinates;

                if (newGeomCoords[0] != geomCoords[0] || newGeomCoords[1] != geomCoords[1]) { return true; }

                return props.external_incident_type != newProps.external_incident_type ||
                    props.dispatch_time != newProps.dispatch_time ||
                    props.arrival_time != newProps.arrival_time;
            },

                ITPACore.needsUpdateItemData[ITPACore.garFeatureName] = function (updateObj) {
                    var p = updateObj.itemData.properties;
                    var newP = updateObj.itemDataSet.properties;
                    if (p.is_active != newP.is_active || p.identifier != newP.identifier || p.total_level != newP.total_level || p.capacity != newP.capacity ||
                        p.parking_site_type_id != newP.parking_site_type_id) {
                        return true;
                    }
                    var g = updateObj.itemData.geometry;
                    var newG = updateObj.itemDataSet.geometry;
                    if ((g.coordinates == undefined && newG.coordinates != undefined) || (g.coordinates != undefined && newG.coordinates == undefined)) {
                        return true;
                    }
                    if (g.coordinates != undefined && newG.coordinates != undefined) {
                        var l = g.coordinates.length;
                        var nl = newG.coordinates.length;
                        if (l != nl) { return true; }
                        if (l == nl && l == 1) {
                            var c = g.coordinates[0], nc = newG.coordinates[0];
                            if (c != undefined && nc != undefined) {
                                l = c.length;
                                nl = nc.length;
                                if (l != nl) { return true; }
                                for (var i = 0; i < l; ++i) {
                                    var cc = c[i];
                                    var ncc = nc[i];
                                    if (cc != undefined && ncc != undefined) {
                                        if (cc.length == 2 && ncc.length == 2) {
                                            if (cc[0] != ncc[0] || cc[1] != ncc[1]) { return true; }
                                        } else { break; }
                                    } else { break; }
                                }
                            }
                        }
                    }
                    return false;
                }

            ITPACore.needsUpdateItemData[ITPACore.occFeatureName] = function (updateObj) {
                /*if (updateObj.itemData.properties.occupancy_percentage != updateObj.itemDataSet.properties.occupancy_percentage) { return true; }

                var geomCoords = updateObj.itemData.geometry.coordinates;
                var newGeomCoords = updateObj.itemDataSet.geometry.coordinates;

                if (newGeomCoords[0] != geomCoords[0] || newGeomCoords[1] != geomCoords[1]) { return true; }

                return false;*/
                return true;
            }

            ITPACore.needsUpdateItemData[ITPACore.ssgFeatureName] = function (updateObj) {
                return true;
            }

            ITPACore.needsUpdateItemData[ITPACore.stopsFeatureName] = function (updateObj) { return true; }

            ITPACore.needsUpdateItemData[ITPACore.linesFeatureName] = function (updateObj) { return true; }

            ITPACore.needsUpdateItemData[ITPACore.searchFeatureName] = function (updateObj) { return true; }

            ITPACore.needsUpdateItemData[ITPACore.etaFeatureName] = function (updateObj) {
                return updateObj.itemData.eta != updateObj.itemDataSet.eta;
            }
        }
        return ITPACore.needsUpdateItemData[featureName];
    },

    GetKeyName: function (featureName) {
        if (ITPACore.keyNames == undefined) {
            ITPACore.keyNames = {};
            //ITPACore.keyNames[ITPACore.busFeatureName] = "public_transport_vehicle_id";
            ITPACore.keyNames[ITPACore.busFeatureName] = "key";
            //ITPACore.keyNames[ITPACore.msgFeatureName] = "message_board_id";
            ITPACore.keyNames[ITPACore.msgFeatureName] = "id";
            //ITPACore.keyNames[ITPACore.incFeatureName] = "event_id";
            ITPACore.keyNames[ITPACore.incFeatureName] = "id";
            //ITPACore.keyNames[ITPACore.garFeatureName] = "parking_site_id";
            ITPACore.keyNames[ITPACore.garFeatureName] = "id";
            ITPACore.keyNames[ITPACore.occFeatureName] = "parking_site_id";
            ITPACore.keyNames[ITPACore.pkrecFeatureName] = "key";
            ITPACore.keyNames[ITPACore.ssgFeatureName] = "color_index";
            //ITPACore.keyNames[ITPACore.stopsFeatureName] = "platform_id";
            ITPACore.keyNames[ITPACore.stopsFeatureName] = "key";
            //ITPACore.keyNames[ITPACore.linesFeatureName] = "line_id";
            ITPACore.keyNames[ITPACore.linesFeatureName] = "key";
            ITPACore.keyNames[ITPACore.searchFeatureName] = "Display_Link_Detail";
            ITPACore.keyNames[ITPACore.directionsFeatureName] = "key";
            ITPACore.keyNames[ITPACore.etaFeatureName] = undefined;
        }
        return ITPACore.keyNames[featureName];
    },

    GetLayerZIndex: function (featureName) {
        if (ITPACore.layerZIndices == undefined) {
            var index = 0;
            ITPACore.layerZIndices = {};
            ITPACore.layerZIndices[ITPACore.garFeatureName] = index++;
            ITPACore.layerZIndices[ITPACore.ssgFeatureName] = index++;
            ITPACore.layerZIndices[ITPACore.linesFeatureName] = index++;
            ITPACore.layerZIndices[ITPACore.busFeatureName] = index++;
            ITPACore.layerZIndices[ITPACore.occFeatureName] = index++;
            ITPACore.layerZIndices[ITPACore.stopsFeatureName] = index++;
            ITPACore.layerZIndices[ITPACore.searchFeatureName] = index++;
            ITPACore.layerZIndices[ITPACore.directionsFeatureName] = index++;
            ITPACore.layerZIndices[ITPACore.msgFeatureName] = index++;
            ITPACore.layerZIndices[ITPACore.incFeatureName] = index++;
        }
        return ITPACore.layerZIndices[featureName];
    },

    GetLayerName: function (featureName) {
        if (ITPACore.layerNames == undefined) {
            ITPACore.layerNames = {};
            ITPACore.layerNames[ITPACore.busFeatureName] = "Buses";
            ITPACore.layerNames[ITPACore.msgFeatureName] = "Messages";
            ITPACore.layerNames[ITPACore.incFeatureName] = "Incidents";
            ITPACore.layerNames[ITPACore.garFeatureName] = "Parking";
            ITPACore.layerNames[ITPACore.ssgFeatureName] = "StreetSmart";
            ITPACore.layerNames[ITPACore.occFeatureName] = "Occupancy";
            ITPACore.layerNames[ITPACore.stopsFeatureName] = "Bus Stops";
            ITPACore.layerNames[ITPACore.linesFeatureName] = "Bus Lines";
            ITPACore.layerNames[ITPACore.searchFeatureName] = "Search Results";
        }
        return ITPACore.layerNames[featureName];
    },

    featureLayers: undefined,

    CreateFeatureLayers: function (settings, then) {
        ITPACore.PreloadImages(function () {
            if (ITPACore.featureLayers == undefined && tf.js.GetIsValidObject(settings) && tf.js.GetIsMap(settings.map)) {
                ITPACore.featureLayers = new ITPACore.FeatureLayers(settings);
            }
            then();
        });
    },

    mapFeatureToaster: undefined,

    CreateMapFeatureToaster: function (map) {
        if (ITPACore.mapFeatureToaster == undefined && tf.js.GetIsMap(map)) {
            ITPACore.mapFeatureToaster = new ITPACore.MapFeatureToaster({ map: map });
        }
    },

    mapETAToaster: undefined,

    CreateMapETAToaster: function (map) {
        if (ITPACore.mapETAToaster == undefined && tf.js.GetIsMap(map)) {
            ITPACore.mapETAToaster = new ITPACore.MapETAToaster({ map: map });
        }
    },

    linesAndStopsAreLinked: false,

    LinkLinesAndStops: function () {
        //console.log("TRYING TO LINK STOPS AND LINES");
        if (ITPACore.featureLayers !== undefined) {
            var stopsLayer = ITPACore.featureLayers.GetFeatureLayer(ITPACore.stopsFeatureName);
            var linesLayer = ITPACore.featureLayers.GetFeatureLayer(ITPACore.linesFeatureName);
            if (!!stopsLayer && !!linesLayer) {
                var stopsKeyedList = stopsLayer.GetKeyedList();
                var linesKeyedList = linesLayer.GetKeyedList();
                if (!!stopsKeyedList && !!linesKeyedList) {
                    var stopsCount = stopsKeyedList.GetItemCount();
                    var linesCount = linesKeyedList.GetItemCount();
                    //console.log(linesKeyedList.GetName());
                    if (stopsCount > 0 && linesCount > 0) {
                        //console.log("LINKING STOPS " + stopsCount + " AND LINES " + linesCount);
                        ITPACore.linesAndStopsAreLinked = true;
                        var lineItems = linesKeyedList.GetKeyedItemList();
                        var stopItems = stopsKeyedList.GetKeyedItemList();
                        var lineCount = 0;

                        for (var i in stopItems) {
                            var item = stopItems[i];
                            item.nLines = 0;
                            item.lines = {};
                        }

                        for (var i in lineItems) {
                            var lineItem = lineItems[i], lineData = lineItem.GetData(), lineDataP = lineData.properties, platformIds = lineDataP.platform_ids, line_id = lineDataP.line_id;
                            var lineFleet = lineDataP.fleet;
                            var lineFleedPrefix = lineFleet + '|';
                            lineItem.lineIndex = lineCount++;
                            var lineKey = lineItem.GetKey();
                            //uncomment to debug by line_id
                            //if (line_id == 26) { line_id = 26; }
                            var nplats = !!platformIds ? platformIds.length : 0;
                            for (var j = 0; j < nplats; ++j) {
                                var platId = platformIds[j];
                                var platKey = lineFleedPrefix + platId;
                                var platItem = stopsKeyedList.GetItem(platKey);
                                if (!!platItem) {

                                    if (platItem.lines[lineKey] == undefined) {
                                        platItem.lines[lineKey] = { lineItem: lineItem, index: j };
                                        ++platItem.nLines;
                                    }
                                    else {
                                        if (platItem.lines[lineKey].index == 0 && j == nplats - 1) {
                                            //console.log('LINKING STOPS AND LINES: platform ' + platId + ' is LOOP begin/end for ' + lineKey);
                                            platItem.isLoop = true;
                                        } else { console.log('LINKING STOPS AND LINES: platform ' + platId + ' added twice to line ' + lineKey); }
                                    }
                                } else { console.log('LINKING STOPS AND LINES: line ' + i + ' is missing platform [' + j + '] = id = ' + platId); }
                            }
                        }
                        //console.log("STOPS AND LINES LINKED");
                    }
                }
            }
        }
    },

    ObjectToParams: function (obj) {
        var p = {};
        for (var key in obj) {
            p[key] = encodeURIComponent(obj[key]);
        }
        return p;
    },

    CreateVisitWebSiteLink: function (url, thenStr, notIonic) {
        var linkStr = "";
        if (tf.js.GetIsNonEmptyString(url)) {
            var onClickStr = "\"window.open('" + url + "', '_system', 'location=yes'); ";
            if (tf.js.GetIsNonEmptyString(thenStr)) { onClickStr += thenStr; }
            onClickStr += " return false;\"";
            var linkStyle = "text-decoration:none;padding:0px;";
            var buttonClass = !!notIonic ? tf.GetStyles().buttonShapedLinkClass : "button button-balanced button-block";
            if (!!notIonic) {
                linkStyle += "background-color:#33cd5f;padding:4px;padding-left:6px;padding-right:6px;";
            }
            //var link = "<a class='" + buttonClass + "' href='" + url + "' onclick=" + onClickStr + " style=\"" + linkStyle + "\">";
            var link = "<a class='" + buttonClass + "' href='#' onclick=" + onClickStr + " style=\"" + linkStyle + "\">";
            linkStr = link + "Visit Website<a/>";
        }
        return linkStr;
    },

    global_map_object: undefined,

    SetLocalStorageItem: function (itemName, item) {
        if (tf.js.GetIsNonEmptyString(itemName) && tf.js.GetIsValidObject(item)) {
            try {
                var itemStr = JSON.stringify(item);
                window.localStorage.setItem(itemName, itemStr);
            }
            catch (e) { }
        }
    },

    GetLocalStorageItem: function (itemName) {
        var item;
        if (tf.js.GetIsNonEmptyString(itemName)) {
            try {
                item = window.localStorage.getItem(itemName);
                if (tf.js.GetIsNonEmptyString(item)) {
                    item = JSON.parse(item);
                }
            }
            catch (e) { item = undefined; }
        }
        return item;
    },

    DelLocalStorageItem: function (itemName) {
        if (tf.js.GetIsNonEmptyString(itemName)) {
            try { window.localStorage.removeItem(itemName); } catch (e) { }
        }
    },

    CreateMapControlButtonHolder: function (map, applyStyles) {
        var styles = tf.GetStyles();
        var div = new tf.dom.Div({ cssClass: styles.GetUnPaddedDivClassNames(false, false) });
        styles.AddDefaultShadowStyle(div);
        div.GetHTMLElement().style.pointerEvents = 'none';
        return { holder: new tf.map.HTMLControl({ map: map, content: div, isVisible: true, cssStyle: applyStyles }), div: div };
    },

    CreateMapButton: function (iconName, callBack, div, visibleBool, backgroundColor, buttonClassName) {
        var button = document.createElement('button');
        var displayStyle = visibleBool != undefined ? (tf.js.GetIsNonEmptyString(visibleBool) ? visibleBool : (!!visibleBool ? "block" : "none")) : "block";
        button.className = buttonClassName != undefined ? buttonClassName : "button button-icon button-clear";
        button.style.display = displayStyle;
        button.style.marginBottom = "4px";
        button.style.padding = "2px";
        button.style.pointerEvents = "all";
        if (backgroundColor != undefined) { button.style.backgroundColor = backgroundColor; }
        var icon = document.createElement('icon');
        icon.className = "button button-icon " + iconName;
        icon.style.padding = "0px";
        button.addEventListener('click', callBack);
        button.appendChild(icon);
        if (!!div) { div.AddContent(button); }
        return button;
    },

    CreateMapButton2: function (iconName, callBack, div, visibleBool, backgroundColor, buttonClassName) {
        var button = document.createElement('button');
        var displayStyle = visibleBool != undefined ? (tf.js.GetIsNonEmptyString(visibleBool) ? visibleBool : (!!visibleBool ? "block" : "none")) : "block";
        button.className = buttonClassName != undefined ? buttonClassName : "button button-icon button-clear";
        button.style.display = displayStyle;
        button.style.marginBottom = "4px";
        button.style.padding = "2px";
        button.style.pointerEvents = "all";
        if (backgroundColor != undefined) { button.style.backgroundColor = backgroundColor; }
        var icon = document.createElement('icon');
        icon.className = "button button-icon " + iconName;
        icon.style.padding = "0px";
        button.addEventListener('click', callBack);
        button.appendChild(icon);
        if (!!div) { div.AddContent(button); }
        return button;
    },

    GetDeviceActivityData: function (geoLocationPos) {
        var data = {}
        //console.log('ITPACore.GetDeviceActivityData');
        if (tf.js.GetIsValidObject(geoLocationPos)) {
            var coords = geoLocationPos.coords;
            if (!!coords) {
                var metersPerSecondToMilesPerHour = 2.23694;
                try {
                    data = {
                        token: ITPACore.AccessToken,
                        lon: coords.longitude,
                        lat: coords.latitude,
                        coordinate_on: tf.js.GetTimeStampFromDate(new Date(geoLocationPos.timestamp))
                    };

                    if (coords.altitude != undefined && coords.altitude != null) {
                        data.altitude = coords.altitude;
                    }
                    if (coords.speed !== undefined && coords.speed !== null) {
                        data.speed_mph = coords.speed * metersPerSecondToMilesPerHour;
                    }
                    if (typeof coords.heading !== 'undefined' && isFinite(coords.heading) && !isNaN(coords.heading)) {
                        data.heading_degree = Math.floor(coords.heading);
                    }
                }
                catch (Exception) {
                    data = {};
                }
            }
        }
        data.uuid = ITPACore.GetDeviceUUID();
        return data;
    },

    MakeAuthForm: function () {
        return {
            email: ITPACore.currentUser.email,
            password: ITPACore.currentUser.password
        };
    },

    SetDeviceUUID: function (uuid) {
        ITPACore.private_deviceUUID = tf.js.GetIsNonEmptyString(uuid) ? uuid : undefined;
    },

    GetDeviceUUID: function () {
        return ITPACore.private_deviceUUID != undefined ? ITPACore.private_deviceUUID : "";
    },

    GeoCodeAddress: function (addressStr, then) {
        if (tf.js.GetFunctionOrNull(then)) { new tf.services.Geocoder({ address: addressStr, callBack: then }); }
    },

    dismissMessagesStorageName: "dismissMsgs",
    dismissMessages: undefined,

    LoadDismissMessages: function () {
        ITPACore.dismissMessages = ITPACore.GetLocalStorageItem(ITPACore.dismissMessagesStorageName);
        if (!ITPACore.dismissMessages) {
            ITPACore.dismissMessages = [];
        }
    },

    SetDismissMessages: function (item) {
        if (!tf.js.GetIsArray(item)) { item = []; }
        ITPACore.dismissMessages = item;
        ITPACore.SetLocalStorageItem(ITPACore.dismissMessagesStorageName, item);
    },

    trackReportCount: 5
};

function g_globalOnVisitedWebSite(then) { if (tf.js.GetFunctionOrNull(then)) { then(); } }
