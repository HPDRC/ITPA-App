"use strict";

ITPACore.DirectionsControl = function (settings) {
    var theThis, styles, itpaFeatureLayers, map, mapFromToControl, mapPrevNextControl, clearButton, startButton, endButton;
    var fromFeature, toFeature, featureLayer, layer, routeFeature, toastr, toasterTitle, dirKeyedList, divMode;
    var busButton, walkButton, bikeButton, carButton, modeOfTransportation, modeButtons, nextButton, prevButton, isShowing, hasRoute;
    var onPrevNextCB, getTargetCoordsCB, onUpdateCB, directionsInstructionsDiv, firstButton, lastButton;
    var $http, uber, uberButton, onUberCB;
    var modeTransportBusTripName;
    var busTrip;

    this.SetLinesStopsNeedUpdate = function () { /*if (!!busTrip) { busTrip.SetLinesStopsNeedUpdate(); }*/ }
    this.GetFromFeature = function () { return fromFeature; }
    this.GetToFeature = function () { return toFeature; }

    this.GetFromOrToFeature = function () { return !!fromFeature ? fromFeature : toFeature; }

    this.GetRouteFeature = function () { return routeFeature; }

    this.Show = function (showBool) { return show(showBool); }
    this.GetIsShowing = function () { return isShowing; }

    this.GetHasRoute = function () { return hasRoute; }

    function show(showBool) {
        isShowing = !!showBool;
        if (!!divMode) { divMode.GetHTMLElement().style.display = isShowing ? 'block' : 'none'; }
        checkDirectionInstructionsVisibility();
        checkMapPrevNextControlVisibility();
    }

    function checkMapPrevNextControlVisibility() { if (mapPrevNextControl) { var doShow = isShowing ? hasRoute : false; mapPrevNextControl.SetVisible(doShow); } }

    function checkDirectionInstructionsVisibility() { if (!!directionsInstructionsDiv) { var doShow = isShowing ? !hasRoute : false; directionsInstructionsDiv.style.display = doShow ? "inline-block" : "none"; } }

    function createButton(className, color, backgroundColor, fontWeight, display, eventListener, title) {
        var button = document.createElement('button');
        button.className = className;
        if (color != undefined) { button.style.color = color; }
        if (backgroundColor != undefined) { button.style.backgroundColor = backgroundColor; }
        button.style.pointerEvents = "all";
        if (fontWeight != undefined) { button.style.fontWeight = fontWeight; }
        button.style.display = display;
        button.addEventListener('click', eventListener);
        if (tf.js.GetIsNonEmptyString(title)) { button.innerHTML = title; }
        return button;
    }

    function updateFeature(currentFeature, coords, label, iconName, scale) {
        if (!!currentFeature) { currentFeature.SetPointCoords(coords); }
        else {
            var style = { icon: true, icon_url: "./img/" + iconName, scale: scale, icon_anchor: [0.5, 1], zindex: 20 };
            var geom = { type: "point", coordinates: coords, style: style };
            layer.AddMapFeature(currentFeature = new tf.map.Feature(geom));
        }
        styles.ChangeOpacityVisibilityClass(clearButton, true);
        return currentFeature;
    }

    function checkUberButton() { if (!!uberButton && !!fromFeature && !!toFeature) { styles.ChangeOpacityVisibilityClass(uberButton, true); } }

    function setFromCoords(coords) { fromFeature = updateFeature(fromFeature, coords, "From", "from3.svg", 1); checkUberButton(); }
    function setToCoords(coords) { toFeature = updateFeature(toFeature, coords, "To", "to.svg", 1); checkUberButton(); }

    function toast(message, timeOut) { toastr.info(toasterTitle, message, { timeOut: timeOut != undefined ? timeOut : 2000, allowHtml: true }); }

    function makeToFromSetToast(name) { return "Trip <span style='font-size: 18px;color: goldenrod;'>" + name + "</span> Location is set"; }

    function getTargetCoords() { return !!getTargetCoordsCB ? getTargetCoordsCB() : map.GetCenter(); }

    function onFrom() { setFromCoords(getTargetCoords()); toast(makeToFromSetToast("From")); updateRoute(); }
    function onTo() { setToCoords(getTargetCoords()); toast(makeToFromSetToast("To")); updateRoute(); }

    function onUber() { if (!!onUberCB) { onUberCB({ sender: theThis, fromFeature: fromFeature, toFeature: toFeature }); } }

    function createIcon(className, paddingTop) {
        var icon = document.createElement('icon'); icon.className = className;
        icon.style.paddingTop = paddingTop != undefined ? paddingTop : "4px";
        return icon;
    }

    var busSVG = '<svg class="svgFullWidthHeight itpa-car-icon" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 16 16" > <path ' +
    'd="M 13.892044,3.909758 C 13.761489,2.6334085 13.553515,1.6396366 13.224485,1.249025 11.867902,-0.35705564 2.3651343,-0.47459112 1.2862023,1.249025 1.0222755,1.6713083 0.83717524,2.6615613 0.71295375,3.9118694 0.31213697,3.9590243 0,4.2964985 0,4.7096313 l 0,1.5635018 c 0,0.3476786 0.22029058,0.6408135 0.52785342,0.7551832 -0.0728438,2.4626101 -0.0137244,5.0318517 0.0953652,6.3096077 0,0.986381 0.66263198,0.822746 0.66263198,0.822746 l 0.6211069,0 0,1.064855 c 0,0.422285 0.4353029,0.76398 0.9716017,0.76398 0.5370031,0 0.9723061,-0.341695 0.9723061,-0.76398 l 0,-1.064855 7.2259587,0 0,1.064855 c 0,0.422285 0.434951,0.76398 0.971957,0.76398 0.536297,0 0.971599,-0.341695 0.971599,-0.76398 l 0,-1.064855 0.204105,0 c 0,0 0.779813,0.106976 0.829786,-0.357534 0,-1.274238 0.08024,-4.0982532 0.01408,-6.7639117 0.326917,-0.1024068 0.56551,-0.4036311 0.56551,-0.7660912 l 0,-1.5635018 C 14.634207,4.2866439 14.306938,3.9435403 13.892045,3.909758 Z M 3.6069971,1.4781134 l 7.2966909,0 0,1.1039175 -7.2966909,0 0,-1.1039175 z M 3.7111595,12.903321 c -0.5728973,0 -1.0370556,-0.464509 -1.0370556,-1.037403 0,-0.572548 0.4641583,-1.036706 1.0370556,-1.036706 0.572897,0 1.037407,0.464158 1.037407,1.036706 0,0.572894 -0.4641581,1.037403 -1.037407,1.037403 z m 7.1534665,0 c -0.572544,0 -1.0377592,-0.464509 -1.0377592,-1.037403 0,-0.572548 0.4648642,-1.036706 1.0377592,-1.036706 0.572895,0 1.037058,0.464158 1.037058,1.036706 3.52e-4,0.572894 -0.46416,1.037403 -1.037058,1.037403 z m 1.31858,-4.5395368 -9.855726,0 0,-5.1694433 9.855726,0 0,5.1694433 z" ' +
    'stroke="null" style="fill-opacity:1" /> </svg>';

    var carSVG = '<svg class="svgFullWidthHeight itpa-car-icon"' +
    'version="1.1"x="0px" y="0px" width="16px" height="16px" viewBox="-1 -2.145 16 16"' +
    'overflow="visible" enable-background="new -1 -2.145 16 16" xml:space="preserve">' +
    '<path fill="null" d="M12.729,4.018l-1.147-2.963C11.367,0.487,10.898,0.004,10.011,0H8.392H5.626H3.979 ' +
    'c-0.883,0.004-1.352,0.487-1.57,1.055L1.262,4.018C0.805,4.077-0.002,4.612,0,5.626v3.773h1.12v1.204 ' +
    'c-0.003,1.485,2.098,1.468,2.098,0V9.399H7h3.772v1.204c0.004,1.468,2.106,1.485,2.107,0V9.399H14V5.626 ' +
    'C13.996,4.612,13.189,4.077,12.729,4.018z M2.483,7.702c-0.693,0.001-1.254-0.576-1.25-1.287C1.229,5.7,1.791,5.122,2.483,5.128 ' +
    'c0.69-0.006,1.25,0.572,1.25,1.288C3.733,7.126,3.174,7.703,2.483,7.702z M7,3.99H6.99H2.456l0.865-2.333 ' +
    'c0.104-0.331,0.267-0.568,0.649-0.574h3.02H7h3.03c0.377,0.006,0.539,0.243,0.648,0.574l0.865,2.333H7z M11.522,7.69 ' +
    'c-0.694,0.002-1.252-0.573-1.256-1.28c0.004-0.713,0.562-1.289,1.256-1.282c0.683-0.006,1.241,0.569,1.244,1.282 ' +
    'C12.764,7.117,12.205,7.692,11.522,7.69z"/></svg>';

    var walkSVG = '<svg class="svgFullWidthHeight itpa-walk-icon" version="1.1" x="0px" y="0px" width="16px" height="16px" viewBox="-3.466 0 16 16" overflow="visible" enable-background="new -3.466 0 16 16" xml:space="preserve">' +
    '<path fill="null" stroke="null" stroke-width="null"' +
    'd="M5.767,1.233C5.767,0.542,5.225,0,4.534,0C3.841,0,3.301,0.542,3.301,1.233c0,0.692,0.54,1.234,1.232,1.234  C5.225,2.467,5.767,1.925,5.767,1.233z M8.79,4.62c0,0-1.472-0.826-2.123-1.168C6.015,3.108,4.72,2.221,3.566,3.247  C3.042,3.713,2.438,6.096,2.438,6.096L0,7.6l0.4,0.558l2.656-0.966l0.742-0.961l0.786,1.733l-1.586,2.78l-1.252,4.674l1.295,0.436  l1.456-4.366l1.077-1.063L7.933,16l1.136-0.524L7.162,8.692c0,0,0.237-0.487,0.237-1.264c0-0.89-0.703-2.347-0.703-2.347  l1.151,0.265l0.258,2.898l0.726,0.068L8.79,4.62z"' +
    'style="" /></svg>';

    var bikeSVG = '<svg class="svgFullWidthHeight itpa-bike-icon" version="1.1" width="24.463997" height="15.999846" viewBox="-0.3 0 25 16"><g style="">' +
    '<path d="m 19.484711,6.0400058 c -0.451506,0 -0.890293,0.066136 -1.303644,0.1786946 l -0.813983,-1.798393 c -0.0064,-0.018442 -0.02544,-0.03116 -0.0318,-0.04833 -0.08267,-0.2213016 -0.286166,-0.3821904 -0.534176,-0.3821904 l -7.7582728,0 1.2146148,-2.5316134 2.066753,0 c 0.152622,0 0.279807,-0.1290926 0.279807,-0.2868017 l 0,-0.88457032 C 12.604014,0.1284563 12.476829,-3.48672e-7 12.324207,-3.48672e-7 l -2.5627736,0 c -0.00636,0 -0.012719,0.006359238672 -0.019078,0.006359238672 C 9.513423,-0.00763144 9.2972088,0.11192228 9.1891018,0.32686459 L 6.4419101,6.0597194 c -0.00636,0.020986 -0.012719,0.042607 -0.012719,0.063592 C 5.9649671,5.9840445 5.4816648,5.9077336 4.9792849,5.9077336 2.2320932,5.9077336 -3.0286e-8,8.1366472 -3.0286e-8,10.886381 c 0,2.750372 2.232093230286,4.979285 4.979284930286,4.979285 2.7535509,0 4.9792849,-2.228913 4.9792849,-4.979285 0,-1.7360709 -0.8902936,-3.2635604 -2.2384525,-4.1544899 0.012719,-0.013354 0.025437,-0.024801 0.031796,-0.041335 l 0.5977686,-1.2457752 7.8854579,0 0.616846,1.3589696 c -1.405392,0.8801188 -2.34656,2.4381326 -2.34656,4.2174465 0,2.7491 2.232094,4.978649 4.979285,4.978649 2.753551,0 4.979285,-2.229549 4.979285,-4.978649 0,-2.749098 -2.225734,-4.9786475 -4.979285,-4.9786475 z M 8.584974,10.883838 c 0,1.991714 -1.6088878,3.607596 -3.6056891,3.607596 -1.9904421,0 -3.6056891,-1.615882 -3.6056891,-3.607596 0,-1.9917131 1.615247,-3.60696 3.6056891,-3.60696 0.292525,0 0.5786908,0.038791 0.8584974,0.1055634 L 4.3242832,10.618021 c -0.1716995,0.362477 -0.012719,0.796177 0.3497582,0.967877 0.3561174,0.171063 0.794905,0.01717 0.9666044,-0.345307 L 7.1477857,8.0062828 C 8.0190016,8.6644642 8.584974,9.7067436 8.584974,10.883838 Z m 10.899737,3.742412 c -1.990442,0 -3.605689,-1.614611 -3.605689,-3.607596 0,-1.2241529 0.610487,-2.3033159 1.538936,-2.955138 l 1.488062,3.277551 c 0.158981,0.366292 0.59141,0.530361 0.960246,0.366292 0.362476,-0.162796 0.527817,-0.592681 0.362476,-0.958973 L 18.753399,7.486097 c 0.235292,-0.050874 0.483302,-0.076311 0.731312,-0.076311 1.996802,0 3.612049,1.6158829 3.612049,3.6088679 0,1.992985 -1.615247,3.607596 -3.612049,3.607596" />'+
    'style="fill-rule:nonzero;"/><path d="m 18.91238,2.0623012 -4.152584,-0.026073 c 0,0 -0.381554,0.077583 -0.432428,0.4674041 -0.05087,0.3917292 0.349758,0.5519821 0.349758,0.5519821 l 2.626366,0.3478504 c 0,0 1.278207,0.2034957 1.608888,-1.3411637" />style="fill-rule:nonzero;"/></g></svg>';

    function changeColor(button, toSelected) {
        var classNames = ["svgModeUnSelected", "svgModeSelected"];
        var indexIn = !!toSelected ? 1 : 0, indexOut = 1 - indexIn;
        tf.dom.ReplaceCSSClass(button, classNames[indexOut], classNames[indexIn]);
    }

    function selectMode(modeName) {
        changeColor(modeButtons[modeOfTransportation], false);
        modeOfTransportation = modeName;
        changeColor(modeButtons[modeOfTransportation], true);
        var modeNameFriendly;
        switch (modeName) {
            default:
            case modeTransportBusTripName:
                modeNameFriendly = "Taking a bus";
                break;
            case tf.consts.routingServiceModeCar:
                modeNameFriendly = "Driving a Car";
                break;
            case tf.consts.routingServiceModeBicycle:
                modeNameFriendly = "Riding a Bicycle";
                break;
            case tf.consts.routingServiceModeFoot:
                modeNameFriendly = "Walking on Foot";
                break;
        }
        toast(modeNameFriendly);
        //toast("Going by " + modeName);
        updateRoute();
    }

    function onBusTrip() { selectMode(modeTransportBusTripName); }
    function onWalk() { selectMode(tf.consts.routingServiceModeFoot); }
    function onBike() { selectMode(tf.consts.routingServiceModeBicycle); }
    function onCar() { selectMode(tf.consts.routingServiceModeCar); }

    function onPrevNext(inc) {
        if (onPrevNextCB) { onPrevNextCB({ sender: theThis, inc: inc }); }
    }

    function onNext() { return onPrevNext(1); }
    function onPrev() { return onPrevNext(-1); }
    function onFirst() { return onPrevNext(0); }
    function onLast() { return onPrevNext(-2); }

    function updateFromNewData(data) {
        featureLayer.UpdateFromNewData({ features: data });
        hasRoute = dirKeyedList.GetItemCount() > 0;
        checkDirectionInstructionsVisibility();
        checkMapPrevNextControlVisibility();
        if (onUpdateCB) { onUpdateCB({ sender: theThis, hasRoute: hasRoute }); }
    }

    function clearRoute() {
        if (hasRoute) {
            if (routeFeature) {
                for (var i in routeFeature) { layer.DelMapFeature(routeFeature[i]); }
                routeFeature = undefined;
            }
            updateFromNewData([]);
        }
    }

    function onClear() {
        clearRoute();
        if (fromFeature) { layer.DelMapFeature(fromFeature); fromFeature = undefined; }
        if (toFeature) { layer.DelMapFeature(toFeature); toFeature = undefined; }
        toast("Trip Locations Cleared");
        styles.ChangeOpacityVisibilityClass(clearButton, false);
        if (!!uberButton) { styles.ChangeOpacityVisibilityClass(uberButton, false); }
    }

    function onExtent() {
        if (!!routeFeature) {
            toast("Directions overview");
            var extent = routeFeature[0].GetGeom().GetExtent();
            for (var i = 1 ; i < routeFeature.length ; ++i) {
                extent = tf.js.MergeMapExtents(extent, routeFeature[i].GetGeom().GetExtent());
            }
            extent = tf.js.ScaleMapExtent(extent, 1.6);
            map.SetVisibleExtent(extent);
        }
    }

    function createMapControl() {
        var unpaddedBlockClass = styles.GetUnPaddedDivClassNames(false, false);
        var unpaddedInlineBlockClass = styles.GetUnPaddedDivClassNames(true, false);
        var unpaddedBlockDivParam = { cssClass: unpaddedBlockClass };
        var unpaddedInlineBlockDivParam = { cssClass: unpaddedInlineBlockClass };

        var className = "lineMapDetail button-less-height", classNameSvg = "lineMapDetail buttonModeSVG";
        var svgButtonClassName = "button button-icon button-test ";
        var svgButtonClassName2 = "button button-icon button-test2 ";

        svgButtonClassName = svgButtonClassName2;

        var currentLine = itpaFeatureLayers.GetCurrentLineItem();
        var currentLineName = !!currentLine ? currentLine.GetData().properties.identifier : "undefined";
        var spacingPx = "6px";

        var mapPrevNextStyles = { position: "absolute", right: "8px", bottom: "8px", zIndex: 3000, pointerEvents: 'none' };
        var mapPrevNextHolder = ITPACore.CreateMapControlButtonHolder(map, mapPrevNextStyles);
        var divPrevNextHolder = mapPrevNextHolder.div;

        var mapFromToStyles = { position: "absolute", right: "0px", top: "12px", width: "100%", zIndex: 3000, pointerEvents: 'none' };
        var mapFromToHolder = ITPACore.CreateMapControlButtonHolder(map, mapFromToStyles);
        var divFromToHolder = mapFromToHolder.div;

        mapPrevNextControl = mapPrevNextHolder.holder;
        mapFromToControl = mapFromToHolder.holder;

        var divFromTo = new tf.dom.Div(unpaddedBlockDivParam);
        var divBot = new tf.dom.Div(unpaddedBlockDivParam);
        var divPrevNext = new tf.dom.Div(unpaddedInlineBlockDivParam);

        divMode = new tf.dom.Div(unpaddedInlineBlockDivParam);

        divPrevNextHolder.GetHTMLElement().style.textAlign = 'right';
        divFromToHolder.GetHTMLElement().style.textAlign = 'center';

        var useBusDirections = false;
        //var useBusDirections = true;

        busButton = createButton(svgButtonClassName + classNameSvg + " marginRightForButtons leftSideBorderRound svgModeUnSelected", undefined, undefined, "bold", "inline-block", onBusTrip);
        busButton.style.marginLeft = busButton.style.marginRight = "1px";
        busButton.innerHTML = busSVG;

        if (useBusDirections) {
            carButton = createButton(svgButtonClassName + classNameSvg + " marginRightForButtons svgModeSelected", undefined, undefined, "bold", "inline-block", onCar);
        }
        else {
            carButton = createButton(svgButtonClassName + classNameSvg + " marginRightForButtons leftSideBorderRound svgModeSelected", undefined, undefined, "bold", "inline-block", onCar);
        }
        carButton.style.marginLeft = carButton.style.marginRight = "1px";
        carButton.innerHTML = carSVG;

        bikeButton = createButton(svgButtonClassName + classNameSvg + " marginRightForButtons svgModeUnSelected", undefined, undefined, "bold", "inline-block", onBike);
        bikeButton.style.marginLeft = bikeButton.style.marginRight = "1px";
        bikeButton.innerHTML = bikeSVG;

        walkButton = createButton(svgButtonClassName + classNameSvg + " rightSideBorderRound svgModeUnSelected", undefined, undefined, "bold", "inline-block", onWalk);
        walkButton.style.marginLeft = walkButton.style.marginRight = "1px";
        walkButton.innerHTML = walkSVG;

        modeButtons = {};
        modeButtons[modeTransportBusTripName] = busButton;
        modeButtons[tf.consts.routingServiceModeCar] = carButton;
        modeButtons[tf.consts.routingServiceModeFoot] = walkButton;
        modeButtons[tf.consts.routingServiceModeBicycle] = bikeButton;

        startButton = createButton(svgButtonClassName2 + classNameSvg + " marginRightForButtons", undefined, undefined, undefined, 'inline-block', onFrom);
        startButton.appendChild(createIcon("itpa-from-icon"));

        if (!!onUberCB) {
            uberButton = createButton(svgButtonClassName2 + classNameSvg + " marginRightForButtons", undefined, undefined, undefined, 'inline-block', onUber);
            uberButton.appendChild(createIcon("itpa-uber-icon"));
        }

        endButton = createButton(svgButtonClassName2 + classNameSvg + " marginRightForButtons", undefined, undefined, undefined, 'inline-block', onTo);
        endButton.appendChild(createIcon("itpa-to-icon"));

        clearButton = createButton(svgButtonClassName2 + classNameSvg, undefined, undefined, undefined, 'inline-block', onClear);
        clearButton.appendChild(createIcon("itpa-trash-icon"));

        //clearButton.style.marginRight = "40px";

        if (!!uberButton) { styles.ChangeOpacityVisibilityClass(uberButton, false); }
        styles.ChangeOpacityVisibilityClass(clearButton, false);

        var extentButton = createButton(svgButtonClassName + classNameSvg + " marginRightForButtons", undefined, undefined, undefined, 'inline-block', onExtent);
        extentButton.appendChild(createIcon("itpa-extent-icon", "8px"));

        firstButton = createButton(svgButtonClassName + classNameSvg + " marginRightForButtons", undefined, undefined, undefined, 'inline-block', onFirst);
        firstButton.appendChild(createIcon("itpa-backward-arrow3-icon", "8px"));

        prevButton = createButton(svgButtonClassName + classNameSvg + " marginRightForButtons", undefined, undefined, undefined, 'inline-block', onPrev);
        prevButton.appendChild(createIcon("itpa-backward-arrow2-icon", "8px"));

        nextButton = createButton(svgButtonClassName + classNameSvg + " marginRightForButtons", undefined, undefined, undefined, 'inline-block', onNext);
        nextButton.appendChild(createIcon("itpa-forward-arrow2-icon", "8px"));

        lastButton = createButton(svgButtonClassName + classNameSvg, undefined, undefined, undefined, 'inline-block', onLast);
        lastButton.appendChild(createIcon("itpa-forward-arrow3-icon", "8px"));

        divPrevNext.AddContent(extentButton, firstButton, prevButton, nextButton, lastButton);

        if (!!uberButton) { divFromTo.AddContent(uberButton); }

        divFromTo.AddContent(startButton, endButton, clearButton);
        divFromTo.GetHTMLElement().style.marginBottom = "8px";

        if (useBusDirections) {
            divMode.AddContent(busButton, carButton, bikeButton, walkButton);
        }
        else {
            divMode.AddContent(carButton, bikeButton, walkButton);
        }

        divPrevNextHolder.AddContent(divPrevNext);
        divFromToHolder.AddContent(divFromTo, divMode);

        show(false);
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

    function getInstructionsAndRoute(notification, routeStyle, startKey) {
        var instructions = [];
        var message = "Routing server not available ";
        var routeFeature, startCoords, endCoords, success = false;

        if (notification != undefined) {
            if (notification.status == 0 || notification.status == 200) {
                var geom = { type: 'linestring', coordinates: notification.route_geometry, style: routeStyle };
                var key = startKey != undefined ? startKey : 0;

                startCoords = geom.coordinates[0], endCoords = geom.coordinates[geom.coordinates.length - 1];
                routeFeature = new tf.map.Feature(geom);

                var len = notification.route_instructions.length, lastIndex = len - 1;

                message = notification.status_message;
                success = true;
                for (var i in notification.route_instructions) {
                    var instruction = notification.route_instructions[i];
                    var coord = notification.route_geometry[instruction[3]];
                    var instructionStr = tf.services.TranslateRoutingInstruction(instruction[0]);
                    var streetName;

                    if (key != lastIndex) {
                        streetName = instruction[1];
                        streetName = streetName.replace('{', '');
                        streetName = streetName.replace('}', '');
                        streetName = streetName.replace(':', ' ');
                        streetName = streetName.replace('_', ' ');
                        if (streetName == '') { streetName = "ahead"; }
                        if (instructionStr == undefined) { console.log('unknown direction instruction'); instructionStr = "Go"; }
                    }
                    else { streetName = "ahead"; instructionStr = "Destination"; }
                    var data = {
                        order: key, geometry: { type: 'point', coordinates: coord },
                        properties: {
                            key: key + 1,
                            instruction: instructionStr, streetName: streetName, lengthMeters: instruction[2], timeInSeconds: instruction[4],
                            LengthMetersStr: instruction[5], postTurnDirectionStr: instruction[6], postTurnDirection: instruction[7]
                        }
                    };
                    ++key;
                    instructions.push(data);
                }
            }
            else { message = notification.status_message; }
        }
        return { instructions: instructions, message: message, routeFeature: routeFeature, success: success, startCoords: startCoords, endCoords: endCoords };
    }

    function onRouteLoaded(notification) {
        var toastrFnc = toastr.error;
        var style = getRouteStyle(true);
        var iAndR = getInstructionsAndRoute(notification, style, 0);
        var errorMessage = iAndR.message;
        var instructions = iAndR.instructions;

        clearRoute();

        if (iAndR.success) {
            toastrFnc = toastr.info;
            setFromCoords(iAndR.startCoords);
            setToCoords(iAndR.endCoords);
            routeFeature = [iAndR.routeFeature];
            layer.AddMapFeature(routeFeature[0]);
            //console.log(JSON.stringify(notification.route_instructions));
        }
        updateFromNewData(instructions);
        toastrFnc(toasterTitle, errorMessage, { timeOut: 2000 });
    }

    function updateRoute() {
        if (fromFeature != undefined && toFeature != undefined) {
            var startCoords = fromFeature.GetPointCoords(), endCoords = toFeature.GetPointCoords();
            clearRoute();
            if (modeOfTransportation == modeTransportBusTripName) {
                busTrip.GetDirections(function (notification) {
                    var toastrFnc = toastr.error;
                    clearRoute();
                    if (notification.success) {
                        var instructions = notification.instructions;
                        routeFeature = notification.routeFeatures;
                        for (var i in routeFeature) { layer.AddMapFeature(routeFeature[i]); }
                        updateFromNewData(instructions);
                        toastrFnc = toastr.info;
                    }
                    toastrFnc(toasterTitle, notification.msg, { timeOut: 2000 });
                }, startCoords, endCoords);
            }
            else {
                new tf.services.Routing({
                    findAlternatives: false, level: 18, lineStringCoords: [startCoords, endCoords],
                    mode: modeOfTransportation, optionalScope: theThis, instructions: true, callBack: onRouteLoaded
                });
            }
        }
    }

    function initialize() {

        itpaFeatureLayers = ITPACore.featureLayers;
        //toasterTitle = "Directions";
        styles = tf.GetStyles();
        hasRoute = false;
        modeOfTransportation = tf.consts.routingServiceModeCar;
        modeTransportBusTripName = "busTrip";

        if (tf.js.GetIsValidObject(settings)) {
            if (map = tf.js.GetMapFrom(settings.map)) {
                busTrip = new ITPACore.BusTrip({
                    stops: settings.stops,
                    routes: settings.routes,
                });

                $http = settings.$http;
                directionsInstructionsDiv = document.getElementById("directionsInstructionsDiv");
                onUberCB = tf.js.GetFunctionOrNull(settings.onUber);
                onPrevNextCB = tf.js.GetFunctionOrNull(settings.onPrevNext);
                getTargetCoordsCB = tf.js.GetFunctionOrNull(settings.getTargetCoords);
                onUpdateCB = tf.js.GetFunctionOrNull(settings.onUpdate);
                toastr = settings.toastr;
                featureLayer = itpaFeatureLayers.GetFeatureLayer(ITPACore.directionsFeatureName);
                dirKeyedList = featureLayer.GetKeyedList();
                layer = featureLayer.GetLayer();
                createMapControl();
            }
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
