"use strict";

if (tf.Transit == undefined) { tf.Transit = {}; }
tf.Transit.PlanTripSteps = {
    fromStartLocation: 0,
    walkFromStartToStop: 1,
    takeTripAtStop: 2,
    leaveTripAtStop: 3,
    walkFromStopToNearbyStop: 4,
    walkFromStopToEndLocation: 5,
    walkFromStartToEndLocation: 6,
    arriveAtEndLocation: 1000
};

ITPACore.BusTrip = function (settings) {
    var theThis, refreshCounter;

    this.GetDirections = function (then, fromCoord, toCoord) { return getDirections(then, fromCoord, toCoord); }

    function notify(then, success, msg, cancelled, routeFeatures, instructions) {
        then({ sender: theThis, cancelled: !!cancelled, success: success, msg: msg, routeFeatures: routeFeatures, instructions: instructions });
    }

    function notifyFailure(then, cancelled) {
        notify(then, false, 'An efficient bus trip could not be found between the start and destination locations', cancelled);
    }

    function getRouteStyle(isHover) {
        var lineWidth = 3, zindex = isHover ? 5 : 1;
        var lineWidthTick = lineWidth * 2 + 1;
        var lineItemColor = "#3af";
        var style = { line: true, line_color: lineItemColor, line_width: lineWidth, zindex: zindex };
        if (isHover) { style.line_dash = [20, 20]; style.line_color = "#fff"; };
        return isHover ? [{ line: true, line_color: "#000", line_width: lineWidthTick + 2, zindex: 3 },
        { line: true, line_color: lineItemColor, line_width: lineWidthTick, zindex: 4 }, style] : style;
    }

    function makeServiceURL(urlParams) {
        var serverURL = "http://transit.cs.fiu.edu/api/v1/transit/plans?agency=MDT";
        var paramStr = '';
        if (!tf.js.GetIsString(urlParams) && tf.js.GetIsValidObject(urlParams)) { urlParams = tf.js.ObjectToURLParams(urlParams); }
        if (tf.js.GetIsNonEmptyString(urlParams)) { paramStr += "&" + urlParams; }
        return serverURL + paramStr;
    }

    function getDirections(then, fromCoord, toCoord) {
        var dateRequested = new Date(), dateRequestedTimeStamp = tf.js.GetTimeStampFromDate(dateRequested);
        var planSettings = {
            date: dateRequestedTimeStamp,
            x1: fromCoord[0], y1: fromCoord[1], x2: toCoord[0], y2: toCoord[1],
            includetg: true, includewi: true, r1: 3, r2: 3,
            maxmins: 180, maxtrips: 3, maxstopr: 2, maxplans: 100, returnfirst: true, mintripdist: 0.5
        };
        //planSettings.date = '2018-04-23 09:10:00.0';
        var jsonGet = new tf.ajax.JSONGet();
        var serviceURL = makeServiceURL(planSettings);
        jsonGet.Request(serviceURL, function (notification) {
            onJSONGot(then, notification);
        }, theThis, { refreshCounter: ++refreshCounter }, false, undefined, undefined, undefined);
    };

    function createRouteStyle(lineWidth, lineCap, lineDash, zIndex) {
        var style = [
            { zindex: zIndex++, line_cap: lineCap, line: true, line_opacity: 1, line_color: "#fff", line_width: lineWidth },
            { zindex: zIndex++, line_cap: lineCap, line: true, line_opacity: 70, line_color: "#ebebeb", line_width: lineWidth + 2, line_dash: lineDash },
            { zindex: zIndex++, line_cap: lineCap, line: true, line_color: "#1fa0ff", line_width: lineWidth, line_dash: lineDash }
        ];
        return style;
    };
    function createFootStyle(lineWidth) { return createRouteStyle(lineWidth, "round", [1, lineWidth + 1], 30); };
    function createBusStyle(lineWidth, color) {
        if (color == undefined) {
            color = "#f00";
        }
        var isHover = true;
        var lineWidth = 2;
        var zindex = 8;
        var lineWidthTick = lineWidth * 2 + 1;
        var lineItemColor = color;
        return [
            { line: true, line_color: "#000", line_width: lineWidthTick + 2, zindex: 3, line_opacity: 20 },
            { line: true, line_color: lineItemColor, line_width: lineWidthTick, zindex: 4, line_opacity: 70 },
            { line: true, line_color: "#fff", line_width: lineWidth + 2, zindex: zindex, line_cap: "butt", line_opacity: 100, line_dash: [16, 10] }
        ];
    };

    function onJSONGot(then, notification) {
        if (tf.js.GetIsValidObject(notification) && tf.js.GetIsValidObject(notification.requestProps)) {
            if (notification.requestProps.refreshCounter == refreshCounter) {
                var data = notification.data;
                if (data.success && data.nPlans > 0) {
                    var polyCode = new tf.map.PolyCode();
                    var plan = data.plans[0], steps = plan.steps, nSteps = steps.length;
                    var lastStep = steps[nSteps - 1], prevStep;
                    var lastLengthInMeters = 0, nBusTrips = 0;
                    var total_time = plan.endHMS - plan.startHMS;
                    var total_distance = (lastStep.tripkm + lastStep.walkkm) * 1000;
                    var instructions = [], lineStringFeatures = [];
                    for (var i = 0; i < nSteps; ++i) {
                        var step = steps[i], coords = step.coords;
                        var lengthInMeters = (step.tripkm + step.walkkm) * 1000;
                        var instructionData = {
                            index: i,
                            isBusDirection: true,
                            step: step,
                            geometry: { type: 'point', coordinates: coords },
                            properties: { instructionCode: step.type, streetName: "", instruction: step.desc, lengthMeters: lengthInMeters - lastLengthInMeters, postTurnDirection: 0 }
                        };
                        //var walkingInstructions = !!step.wi ? tf.js.JSONParse(step.wi) : undefined;
                        lastLengthInMeters = lengthInMeters;
                        var hms = tf.js.TranslateHourMinSec(step.hms);
                        switch (step.type) {
                            case tf.Transit.PlanTripSteps.takeTripAtStop:
                                ++nBusTrips;
                                instructionData.properties.instruction = hms.HM + " - " + instructionData.properties.instruction;
                                break;
                            case tf.Transit.PlanTripSteps.walkFromStartToStop:
                                instructionData.fromCoords = data.startCoords;
                                instructionData.toCoords = coords;
                                instructionData.properties.instruction = hms.HM + " - " + instructionData.properties.instruction;
                                break;
                            case tf.Transit.PlanTripSteps.walkFromStopToNearbyStop:
                                instructionData.fromCoords = prevStep.coords;
                                instructionData.toCoords = coords;
                                instructionData.properties.instruction = hms.HM + " - " + instructionData.properties.instruction;
                                break;
                            case tf.Transit.PlanTripSteps.walkFromStartToEndLocation:
                                instructionData.fromCoords = prevStep.coords;
                                instructionData.toCoords = coords;
                                instructionData.properties.instruction = hms.HM + " - " + instructionData.properties.instruction;
                                break;
                            case tf.Transit.PlanTripSteps.walkFromStopToEndLocation:
                                instructionData.fromCoords = prevStep.coords;
                                instructionData.toCoords = coords;
                                instructionData.properties.instruction = hms.HM + " - " + instructionData.properties.instruction;
                                break;
                            case tf.Transit.PlanTripSteps.leaveTripAtStop:
                            case tf.Transit.PlanTripSteps.takeTripAtStop:
                                instructionData.properties.instruction = hms.HM + " - " + instructionData.properties.instruction;
                                break;
                        }
                        instructions.push(instructionData);
                        //extent = tf.js.UpdateMapExtent(extent, coords);
                        if (tf.js.GetIsNonEmptyString(step.tripCls)) {
                            var coords = polyCode.DecodeLineString(JSON.parse(step.tripCls), 6);
                            var startIndex = prevStep.sindex;
                            var endIndex = step.sindex + 2 <= coords.length ? step.sindex + 2 : coords.length;
                            coords = coords.slice(startIndex, endIndex);
                            if (startIndex < endIndex) {
                                coords[0] = prevStep.coords;
                                coords[coords.length - 1] = step.coords;
                            }
                            var colorStr = tf.js.GetIsNonEmptyString(step.colorStr) ? '#' + step.colorStr : '#f00';
                            var style = createBusStyle(9, colorStr);
                            var geom = { type: 'linestring', coordinates: coords, style: style, hoverStyle: style };
                            lineStringFeatures.push(new tf.map.Feature(geom));
                        }
                        if (tf.js.GetIsNonEmptyArray(step.wg)) {
                            var style = createFootStyle(9);
                            var geom = { type: 'linestring', coordinates: step.wg, style: style, hoverStyle: style };
                            lineStringFeatures.push(new tf.map.Feature(geom));
                        }
                        prevStep = step;
                    };

                    for (var i = 0; i < instructions.length; ++i) {
                        instructions[i].order = i;
                        instructions[i].properties.key = i + 1;
                    }
                    var lineLines = nBusTrips == 1 ? 'bus' : 'buses';
                    notify(then, true, 'Found trip using ' + nBusTrips + ' ' + lineLines, false, lineStringFeatures, instructions);
                    return;
                }
            }
        }
        notifyFailure(then, false);
    }

    function initialize() {
        refreshCounter = 0;
    };

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

