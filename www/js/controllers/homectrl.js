"use strict;"

starter.controllers.controller('HomeCtrl', ['$scope', '$state', '$ionicModal', '$ionicPopup', 'toastr',
    'GeoLocate', 'ITPAUser', '$http',
function ($scope, $state, $ionicModal, $ionicPopup, toastr, GeoLocate, ITPAUser, $http) {

    //toastr.options.preventDuplicates = true;

    $scope.hasCredentials = ITPACore.hasCredentialsSaved;

    var uber;

    var mapCenter;
    var showingLines = false, fullyInited = false, showingAllLines = true;

    var homeNotification, homeInit, homeOngoing, list, map, itpaFeatureLayers, lineBusMapControl, directionsControl, msgControl, incControl;
    var barHeight = 44, allBarHeights = barHeight * 3;

    var searchTextControl;

    $scope.mapTemplateHeight = "calc(100% - " + allBarHeights + "px)";
    //$scope.mapTemplateHeight = "300px";

    var listHeight = 60;
    //var listHeight = 80;
    //var listHeight = 110;
    //var listHeight = 120;
    //var listHeight = 160;

    function calcMapListHeights() {
        if (ITPACore.isIOS) {
            var mapTopDiv = document.getElementById("mapTopDiv");
            tf.dom.ReplaceCSSClass(mapTopDiv, "mapTop", "mapTop-ios");
            barHeight = 64;
            //mapTopDiv.style.top = "64px";
        }
        $scope.listContainerHeight = listHeight + "px";
        $scope.mapContainerHeight = "calc(100% - " + $scope.listContainerHeight + " - " + barHeight + "px)";
    }

    calcMapListHeights();

    //$scope.text = { searchText: '1 east flagler st miami fl' };
    $scope.text = { searchText: '' };

    function setLineExtent(lineItem) {
        if (!!lineItem) {
            var mapFeature = itpaFeatureLayers.GetMapFeatureFromItem(lineItem);
            var extent = mapFeature.GetGeom().GetExtent();
            if (extent[0] < extent[2]) {
                extent = tf.js.ScaleMapExtent(extent, 1.6);
                map.SetVisibleExtent(extent);
            }
        }
    }

    $scope.onClickCard = function (card) {
        var item = card.item;
        var mapFeature = itpaFeatureLayers.GetMapFeatureFromItem(item);
        if (!!mapFeature) {
            var pointCoords;
            if (mapFeature.GetIsPoint()) {
                pointCoords = mapFeature.GetPointCoords();
                if (pointCoords[0] == 0) {
                    pointCoords = [tf.consts.defaultLongitude, tf.consts.defaultLatitude];
                }
            }
            else {
                if (item.featureName == ITPACore.garFeatureName) {
                    var occItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.occFeatureName, item.GetKey());
                    if (occItem) {
                        pointCoords = itpaFeatureLayers.GetMapFeatureFromItem(occItem).GetPointCoords();
                    }
                }
            }
            if (pointCoords) {
                map.AnimatedSetCenterIfDestVisible(pointCoords);
                itpaFeatureLayers.SelectAndToast(mapFeature, pointCoords);
            }
            else {
                setLineExtent(item);
                itpaFeatureLayers.Select(mapFeature, map.GetCenter());
            }
        }
        if (item.featureName == ITPACore.linesFeatureName) {
            setCurrentLineFromItem(item);
        }
    }

    function setCurrentLineFromItem(item) {
        var lineId;
        switch (item.featureName) {
            case ITPACore.linesFeatureName:
                //lineId = item.GetData().properties.line_id;
                lineId = item.GetKey();
                linesItem = item;
                break;
            case ITPACore.busFeatureName:
                lineId = item.GetData().properties.line_id;
                linesItem = itpaFeatureLayers.GetKeyedItem(ITPACore.linesFeatureName, lineId);
                break;
        }
        if (lineId != undefined) {
            //if (itpaFeatureLayers.GetCurrentLine() != lineId) {
            var toastedItem = ITPACore.mapFeatureToaster.GetToastedItem();
            if (!!toastedItem && toastedItem.featureName == ITPACore.busFeatureName) {
                if (toastedItem.GetData().properties.line_id != lineId) {
                    ITPACore.mapFeatureToaster.CloseToast();
                }
            }
            itpaFeatureLayers.SetCurrentLine(lineId);
            lineBusMapControl.Update();
            if (linesItem != undefined && showingLines) {
                setTimeout(function () { list.scrollToItem(linesItem); }, 100);
            }
        }
    }

    function showMyLocationToast() {
        var lastLocation = homeOngoing.GetLastLocation();
        if (!!lastLocation) { toastr.info("lat " + lastLocation[1].toFixed(3) + ' lon ' + lastLocation[0].toFixed(3), "My Location", { timeOut: 4000 }); }
        else { toastr.info(undefined, "My Location is unknown", { timeOut: 3000 }); }
    }

    function setSearchResultExtent() {
        var kl = itpaFeatureLayers.GetKeyedList(ITPACore.searchFeatureName);
        var ki = kl.GetKeyedItemList();
        var gf = itpaFeatureLayers.GetGeoCodeFeature();
        var extent, count = 0;

        if (!!gf) {
            var pc = gf.GetPointCoords();
            extent = [pc[0], pc[1], pc[0], pc[1]];
            ++count;
        }

        for (var i in ki) {
            var i = ki[i], d = i.GetData(), g = d.geometry, c = g.coordinates;
            if (extent == undefined) { extent = [c[0], c[1], c[0], c[1]]; }
            else { extent = tf.js.UpdateMapExtent(extent, c); }
            ++count;
        }

        if (count > 0) {
            if (count == 1) { setMapToStreetLevel(); }
            else {
                extent = tf.js.ScaleMapExtent(extent, 1.6);
                if (extent[0] < extent[2]) {
                    map.SetVisibleExtent(extent);
                    if (map.GetLevel() > ITPACore.mapMaxLevel) {
                        map.AnimatedSetLevel(ITPACore.mapMaxLevel);
                        //map.AnimatedSetLevel(10);
                    }
                }
            }
        }
    }

    //event handlers
    function onFeatureRefreshed(featureName) {
        if (featureName == ITPACore.searchFeatureName) {
            var nResults = getNSearchResults();
            toastr.info(nResults + " items", "Search Results", { timeOut: 3000 });
            if (!itpaFeatureLayers.IsLayerShowing(ITPACore.searchFeatureName)) {
                //itpaFeatureLayers.ShowLayer(ITPACore.searchFeatureName, true);
                homeOngoing.ClickOnMapButton(ITPACore.searchFeatureName);
            }
            setSearchResultExtent();
        }
        else if (featureName == ITPACore.linesFeatureName || featureName == ITPACore.stopsFeatureName) {
            if (!!directionsControl) { directionsControl.SetLinesStopsNeedUpdate(); }
        }
        else if (featureName == ITPACore.pkrecFeatureName) {
            console.log('home rec refresh');
        }
    }

    function onETARefresh() { if (!!lineBusMapControl) { lineBusMapControl.Update(); } }

    function onLineNameClicked() {
        showingLines = true;
        var featureName = showingLines ? ITPACore.linesFeatureName : ITPACore.busFeatureName;
        list.showCards(featureName);
        setLineExtent(itpaFeatureLayers.GetCurrentLineItem());
        if (showingLines) {
            setTimeout(function () { list.scrollToItem(itpaFeatureLayers.GetCurrentLineItem()); }, 300);
        }
    }

    function moveToPointItem(pointItem) {
        if (!!pointItem) {
            var geom = pointItem.GetData().geometry;
            if (geom.type.toLowerCase() == "point") {
                map.SetCenter(geom.coordinates);
            }
        }
    }

    function animateToPointItem(pointItem) {
        if (!!pointItem) {
            var geom = pointItem.GetData().geometry;
            if (geom.type.toLowerCase() == "point") {
                map.AnimatedSetCenterIfDestVisible(geom.coordinates);
            }
        }
    }

    function onBusNameClicked() {
        var toastedItem = ITPACore.mapFeatureToaster.GetToastedItem();

        if (!!toastedItem && toastedItem.featureName == ITPACore.busFeatureName) {
            animateToPointItem(toastedItem);
            ITPACore.mapETAToaster.OnFirst();
            if (!showingLines) { list.scrollToItem(toastedItem); }
        }
    }

    function onNextPrevStopClicked(notification) {
        ITPACore.mapETAToaster.OnNextPrev(notification.isNext);
        onStopNameClicked();
    }

    function onStopNameClicked() {
        var stopItem;
        var eta = ITPACore.mapETAToaster.GetLastETAClicked();
        if (!!eta) { animateToPointItem(eta.stopItem); }
    }

    function onLineDirectionClicked() {
        var curLine = itpaFeatureLayers.GetCurrentLineItem();
        if (!!curLine) {
            /*
            var curLineP = curLine.GetData().properties;
            var direction = curLineP.direction, lineId = curLineP.line_id, lineNumber = curLineP.line_number;
            var lineList = itpaFeatureLayers.GetKeyedList(ITPACore.linesFeatureName);
            var lineItems = lineList.GetKeyedItemList();
            for (var i in lineItems) {
                var line = lineItems[i], lineP = line.GetData().properties;
                if (lineP.line_id != lineId && lineP.line_number == lineNumber) {
                    setCurrentLineFromItem(line);
                    break;
                }
            }
            */
            setLineExtent(itpaFeatureLayers.GetCurrentLineItem());
        }
    }

    function onShowAllLinesCLicked() {
        //toastr.info(undefined, 'all lines clicked');
        ITPACore.mapFeatureToaster.CloseToast();
        showingAllLines = !showingAllLines;
        itpaFeatureLayers.ShowAllLines(showingAllLines);
        if (showingAllLines) {
            setMapToOverview();
        }
        else {
            setLineExtent(itpaFeatureLayers.GetCurrentLineItem());
        }
    }

    function getShowingAllLines() { return showingAllLines; }

    function onMapButtonClicked(featureName) {
        if (fullyInited) {
            var showingMsg, showFeatureName = true, showLineBusControl = false, showDirectionsControl = false, showMapCenter = false;
            var layersShowHide, addDirectionsLayer = true, showIncControl, showMsgControl;

            switch (featureName) {
                case ITPACore.busFeatureName:
                    showingMsg = "Transit";
                    layersShowHide = [ITPACore.linesFeatureName, ITPACore.stopsFeatureName, ITPACore.busFeatureName];
                    showLineBusControl = true;
                    showingLines = false;
                    setMapToOverview();
                    break;

                case ITPACore.garFeatureName:
                    showingMsg = "Parking";
                    layersShowHide = [ITPACore.occFeatureName, ITPACore.garFeatureName/*, ITPACore.ssgFeatureName*/];
                    panHome();
                    break;

                case ITPACore.incFeatureName:
                    showingMsg = "Incidents";
                    layersShowHide = [ITPACore.incFeatureName];
                    showIncControl = true;
                    setMapToOverview();
                    break;

                case ITPACore.msgFeatureName:
                    showingMsg = "Messages";
                    layersShowHide = [ITPACore.msgFeatureName];
                    showMsgControl = true;
                    setMapToOverview();
                    break;

                case ITPACore.searchFeatureName:
                    showingMsg = "Search Results";
                    layersShowHide = [ITPACore.searchFeatureName];
                    if (!getNSearchResults()) { var gf = itpaFeatureLayers.GetGeoCodeFeature(); if (!gf) { onSearch();  } }
                    break;

                case ITPACore.directionsFeatureName:
                    showingMsg = "Directions";
                    layersShowHide = [];
                    addDirectionsLayer = true;
                    showDirectionsControl = true;
                    showMapCenter = true;
                    break;
            }

            if (!!layersShowHide) {
                if (addDirectionsLayer) { layersShowHide.push(ITPACore.directionsFeatureName); }
                itpaFeatureLayers.ShowHideFeatureLayers(layersShowHide);
            }
            if (!!mapCenter) { mapCenter.style.display = showMapCenter ? "block" : "none"; }
            directionsControl.Show(showDirectionsControl);
            lineBusMapControl.Show(!!showLineBusControl);
            msgControl.Show(showMsgControl);
            incControl.Show(showIncControl);
            if (showFeatureName) { list.showCards(featureName); }
            homeOngoing.CheckButtonsEnabled();
            if (!!showingMsg) { toastr.success(undefined, "Showing " + showingMsg, { timeOut: 3000 }); }
        }
    }

    //search
    function getNSearchResults() { return itpaFeatureLayers.GetItemCount(ITPACore.searchFeatureName); }
    function onSearch() {
        if (!!itpaFeatureLayers) {
            var searchText = $scope.text.searchText;
            itpaFeatureLayers.SetQueryStr(searchText);
            itpaFeatureLayers.GeoCode(searchText, function (notification) { if (notification.status) { toastr.info(undefined, "Found 1 address"); setSearchResultExtent(); } });
            toastr.info(undefined, "Searching...", { timeOut: 1000 });
            homeOngoing.RefreshSearch();
        }
    }
    $scope.onSearch = function () { onSearch(); }

    //about
    var aboutModal;
    $ionicModal.fromTemplateUrl('templates/modal/about.html', { scope: $scope }).then(function (modal) { aboutModal = modal; });
    $scope.onAbout = function () { aboutModal.show(); }
    $scope.closeAbout = function () { aboutModal.hide(); }

    //ellipsis - TerraFly link
    var ellipsisModal;
    $scope.ellipsisSettings = {
        fromURL: undefined,
        toURL: undefined,
        currentURL: undefined,
        centerURL: undefined
    };
    $ionicModal.fromTemplateUrl('templates/modal/ellipsis.html', { scope: $scope }).then(function (modal) { ellipsisModal = modal; });
    $scope.closeEllipsis = function () { ellipsisModal.hide(); }
    $scope.onEllipsis = function () {
        var fromFeature = !!directionsControl ? directionsControl.GetFromFeature() : undefined;
        var toFeature = !!directionsControl ? directionsControl.GetToFeature() : undefined;
        var lastLocation = !!homeOngoing ? homeOngoing.GetLastLocation() : undefined;
        $scope.ellipsisSettings.fromURL = createEllipsisURL(!!fromFeature ? fromFeature.GetPointCoords() : undefined);
        $scope.ellipsisSettings.toURL = createEllipsisURL(!!toFeature ? toFeature.GetPointCoords() : undefined);
        $scope.ellipsisSettings.currentURL = createEllipsisURL(!!lastLocation ? lastLocation : undefined);
        $scope.ellipsisSettings.centerURL = createEllipsisURL(!!map ? map.GetCenter() : undefined);
        ellipsisModal.show();
    }
    function createEllipsisURL(coords) {
        return !!coords ? "http://vn4.cs.fiu.edu/cgi-bin/gnis.cgi?Lat=" + coords[1] + "&Long=" + coords[0] + "&vid=itpaapp&tfaction=arqueryitpamore" : undefined;
    }
    $scope.onEllipsisGo = function (goURL) {
        $scope.closeEllipsis();
        if (goURL) { window.open(goURL, '_system', 'location=yes'); }
        return false;
    }

    //msg dismiss
    $scope.dismissMsgArray;
    var msgDismissModal;
    $ionicModal.fromTemplateUrl('templates/modal/msgdismiss.html', { scope: $scope }).then(function (modal) { msgDismissModal = modal; });
    function onDismissMsg(message) {
        dismissMsgArray = {};
        var len = ITPACore.dismissMessages.length, key = '0';

        if (!ITPACore.GetIsDismissedMessage(message)) {
            dismissMsgArray[key] = { key: '0', message: message.toLowerCase() };
        }
        for (var i = 0 ; i < len ; ++i) {
            var m = ITPACore.dismissMessages[i];
            var key = '' + (i + 1);
            dismissMsgArray[key] = { key: key, message: m };
        }
        $scope.dismissMsgArray = dismissMsgArray;
        msgDismissModal.show();
    }
    $scope.deleteMsgDismiss = function(message) { delete $scope.dismissMsgArray[message.key]; }
    $scope.closeMsgDismiss = function (confirmed) {
        msgDismissModal.hide();
        if (confirmed) {
            var newMsgs = [];
            for (var i in $scope.dismissMsgArray) { newMsgs.push($scope.dismissMsgArray[i].message); }
            ITPACore.SetDismissMessages(newMsgs);
            homeOngoing.UpdateNow(ITPACore.msgFeatureName);
        }
    }

    //button handlers
    function panHome() { if (!!map) { map.SetCenter(ITPACore.mapHomeCenter); map.SetLevel(ITPACore.mapInitialLevel); } }
    function panBBC() { if (!!map) { map.SetCenter(ITPACore.mapBBCCenter); map.SetLevel(ITPACore.mapInitialLevel); } }
    function setMapToOverview() { if (!!map) { map.SetVisibleExtent(ITPACore.mapExtent); } }
    function setMapToStreetLevel() {
        if (!!map) {
            var targetCoords;
            var lastMapButtonClicked = homeOngoing.GetLastMapButtonClicked();

            if (lastMapButtonClicked == ITPACore.busFeatureName) {
                var eta = ITPACore.mapETAToaster.GetLastETAClicked();
                if (!!eta) {
                    var etaFeature = itpaFeatureLayers.GetMapFeatureFromItem(eta.stopItem);
                    if (!!etaFeature) { targetCoords = etaFeature.GetPointCoords(); }
                }
            }

            if (targetCoords == undefined) {
                var toastedItem = ITPACore.mapFeatureToaster.GetToastedItem();

                if (!!toastedItem) {
                    moveToPointItem(toastedItem);
                }
                else if (itpaFeatureLayers.IsLayerShowing(ITPACore.searchFeatureName)) {
                    var gf = itpaFeatureLayers.GetGeoCodeFeature();
                    if (!!gf) { targetCoords = gf.GetPointCoords(); }
                }
                else if (homeOngoing.GetLastMapButtonClicked() == ITPACore.directionsFeatureName) {
                    var fromOrTo = directionsControl.GetFromOrToFeature();
                    if (!!fromOrTo) { targetCoords = fromOrTo.GetPointCoords(); }
                }
            }

            if (targetCoords != undefined) {
                map.SetCenter(targetCoords);
            }

            map.SetLevel(ITPACore.mapMaxLevel - 1);
        }
    }

    function onStreetLevel() { toastr.info(undefined, "Street Level", { timeOut: 3000 }); setMapToStreetLevel(); }
    function onOverview() { toastr.info(undefined, "Overview", { timeOut: 3000 }); setMapToOverview(); }
    function onHome(event) { toastr.info(undefined, "UniversityCity", { timeOut: 3000 }); panHome(); }
    function onBBC(event) { toastr.info(undefined, "FIU BBC Campus", { timeOut: 3000 }); panBBC(); }
    function onLocation() {
        showMyLocationToast(); var lastLocation = homeOngoing.GetLastLocation(); if (!!lastLocation && !!map) {
            map.SetCenter(lastLocation);
        }
    }

    function getDirectionTargetCoords() {
        var targetCoords;
        var lastMapButtonClicked = homeOngoing.GetLastMapButtonClicked();

        if (lastMapButtonClicked == ITPACore.busFeatureName) {
            var eta = ITPACore.mapETAToaster.GetLastETAClicked();
            if (!!eta) { 
                var etaFeature = itpaFeatureLayers.GetMapFeatureFromItem(eta.stopItem);
                if (!!etaFeature) { targetCoords = etaFeature.GetPointCoords(); }
            }
        }

        if (targetCoords == undefined) {
            var toastedMapFeature = ITPACore.mapFeatureToaster.GetToastedMapFeature();

            if (!!toastedMapFeature && toastedMapFeature.GetIsPoint()) {
                targetCoords = toastedMapFeature.GetPointCoords();
            }
        }

        if (targetCoords == undefined) {
            if (lastMapButtonClicked == ITPACore.searchFeatureName) {
                var gf = itpaFeatureLayers.GetGeoCodeFeature();
                if (!!gf) { targetCoords = gf.GetPointCoords(); }
            }
        }

        if (targetCoords == undefined) { targetCoords = map.GetCenter(); }

        return targetCoords;
    }

    function onUpdateDirections(notification) {
        ITPACore.directionsRouteFeature = notification.sender.GetRouteFeature();
        msgControl.Update();
        incControl.Update();
    }

    //uber
    var uberModal;
    $ionicModal.fromTemplateUrl('templates/modal/uber.html', { scope: $scope }).then(function (modal) { uberModal = modal; });
    $scope.closeUber = function () { uberModal.hide(); }

    $scope.uberPriceArray = [];
    $scope.isRefreshingUber;
    $scope.uberListIsEmpty;

    $scope.selectUberPrice = function (priceItem) {
        if (priceItem.isAvailable) {
            toastr.info('Requesting Uber Ride...', undefined, { timeOut: 3000 });
            var url = uber.MakeSetPickupUrl(uberFromCoords, "From-Location", uberToCoords, "To-Location", priceItem.product_id);
            window.open(url, '_system', 'location=yes');
            $scope.closeUber();
        }
        else {
            toastr.clear();
            toastr.error('Uber Ride not available for trip endpoints', undefined, { timeOut: 3000 });
        }
    }

    var uberProductsRefreshed, uberTimesRefreshed, uberPriceRefreshed;
    var uberProducts, uberTimes, uberPrices;

    function checkUberRefreshEnded() {

        if (uberProductsRefreshed && uberTimesRefreshed && uberPriceRefreshed) {

            var data = uberProducts;

            $scope.isRefreshingUber = false;

            var len = data.length;

            if (!($scope.uberListIsEmpty = (len == 0))) {

                var now = new Date();

                for (var i = 0 ; i < len ; ++i) {
                    var d = data[i];
                    d.sharedStr = d.shared ? 'Shared' : 'Not shared';
                    d.sharedBkColor = d.shared ? "rgb(0,255,0)" : "rgb(255,0,0)";
                    d.availableBkColor = "rgb(255,0,0)";
                    d.endTime = "Unavailable";
                    d.etaTime = "";
                    d.isAvailable = false;

                    for (var j = 0 ; j < uberPrices.length ; ++j) {
                        var thisPrice = uberPrices[j];
                        if (thisPrice.product_id == d.product_id) {
                            if (thisPrice.duration != undefined) {
                                var endTime = new Date();
                                endTime.setSeconds(now.getSeconds() + thisPrice.duration);
                                //d.endTime = "Trip end " + tf.js.GetAMPMHourWithMinutes(endTime);
                                d.endTime = "Available";
                                d.availableBkColor = "rgb(0,255,0)";
                                d.isAvailable = true;
                            }
                            d.estimate = thisPrice.estimate;
                            break;
                        }
                    }

                    if (d.isAvailable) {
                        for (var j = 0 ; j < uberTimes.length ; ++j) {
                            var thisTime = uberTimes[j];
                            if (thisTime.product_id == d.product_id) {
                                var etaTime = new Date();
                                etaTime.setSeconds(now.getSeconds() + thisTime.estimate);
                                d.etaTime = ' (' + tf.js.GetAMPMHourWithMinutes(etaTime) + ')';
                                break;
                            }
                        }
                    }
                }
            }

            $scope.uberPriceArray = data;
        }
    }

    var uberFromCoords, uberToCoords;

    $scope.refreshUber = function () {

        if (!$scope.isRefreshingUber) {
            var fromFeature = !!directionsControl ? directionsControl.GetFromFeature() : undefined;
            var toFeature = !!directionsControl ? directionsControl.GetToFeature() : undefined;

            $scope.isRefreshingUber = true;
            $scope.uberListIsEmpty = false;
            $scope.uberPriceArray = [];

            uberProducts = uberTimes = uberPrices = [];
            uberProductsRefreshed = uberTimesRefreshed = uberPriceRefreshed = true;

            uberFromCoords = uberToCoords = undefined;

            if (!!fromFeature && !!toFeature) {

                uberProductsRefreshed = uberTimesRefreshed = uberPriceRefreshed = false;

                var fromCoords = fromFeature.GetPointCoords();
                var toCoords = toFeature.GetPointCoords();

                uber.GetProducts(function (data) {
                    uberProducts = !!data && tf.js.GetIsArray(data.products) ? data.products : [];
                    uberProductsRefreshed = true;
                    checkUberRefreshEnded();
                }, fromCoords);

                uber.GetTimeEstimate(function (data) {
                    uberTimes = !!data && tf.js.GetIsArray(data.times) ? data.times : [];
                    uberTimesRefreshed = true;
                    checkUberRefreshEnded();
                }, fromCoords);

                uber.GetPriceEstimate(function (data) {
                    uberPrices = !!data && tf.js.GetIsArray(data.prices) ? data.prices : [];
                    uberPriceRefreshed = true;
                    checkUberRefreshEnded();
                }, fromCoords, toCoords, 1);
            }
            uberFromCoords = fromCoords.slice(0);
            uberToCoords = toCoords.slice(0);
            checkUberRefreshEnded();
        }
    }

    function onUber(notification) {
        $scope.refreshUber();
        uberModal.show();
    }

    function onPrevNextDirection(notification) {
        var inc = notification.inc;
        var dirkl = itpaFeatureLayers.GetKeyedList(ITPACore.directionsFeatureName);
        var nextIndex, count = dirkl.GetItemCount();

        if (inc == 0) { nextIndex = 0; }
        else if (inc == -2) { nextIndex = count - 1; }
        else {
            var toastedItem = ITPACore.mapFeatureToaster.GetToastedItem();
            if (!!toastedItem && toastedItem.featureName != ITPACore.directionsFeatureName) { toastedItem = undefined; }

            if (!!toastedItem) {
                var curIndex = toastedItem.GetData().order;
                nextIndex = curIndex + inc;
            }
            else { nextIndex = inc < 0 ? count - 1 : 0; }
        }

        if (nextIndex < 0) { return; } else if (nextIndex >= count) { return; }

        if (nextIndex >= 0 && nextIndex < count) {
            var nextItem = dirkl.GetItem(nextIndex + 1);
            if (!!nextItem) {
                var nextFeature = itpaFeatureLayers.GetMapFeatureFromItem(nextItem);
                if (!!nextFeature) {
                    itpaFeatureLayers.SelectAndToast(nextFeature);
                    animateToPointItem(nextItem);
                    setTimeout(function () { list.scrollToItem(nextItem); }, 50);
                }
            }
        }
    }

    //init
    function afterLinesAndStopsAreLoaded() {
        homeOngoing.StartLocationTrack();
        var lineKeyedList = itpaFeatureLayers.GetKeyedList(ITPACore.linesFeatureName);
        var lineKeyedItemList = lineKeyedList.GetKeyedItemList();
        var firstLine;

        for (var i in lineKeyedItemList) {
            var thisLine = lineKeyedItemList[i];
            if (firstLine == undefined) { firstLine = thisLine; break;}
        }
        if (firstLine) { itpaFeatureLayers.SetCurrentLine(firstLine.GetData().properties.line_id); }
        
        directionsControl = new ITPACore.DirectionsControl({
            stops: itpaFeatureLayers.GetKeyedList(ITPACore.stopsFeatureName),
            routes: itpaFeatureLayers.GetKeyedList(ITPACore.linesFeatureName),
            map: map, toastr: toastr, onPrevNext: onPrevNextDirection,
            getTargetCoords: getDirectionTargetCoords,
            onUber: onUber,
            $http: $http,
            onUpdate: onUpdateDirections
        });
        lineBusMapControl = new ITPACore.LineBusMapControl({
            map: map, onLineNameClicked: onLineNameClicked, onLineDirectionClicked: onLineDirectionClicked, onShowAllLinesCLicked: onShowAllLinesCLicked, getShowAllLines: getShowingAllLines,
            onBusNameClicked: onBusNameClicked, onStopNameClicked: onStopNameClicked, onNextPrevStopClicked: onNextPrevStopClicked
        });
        msgControl = new ITPACore.MsgControl({ map: map, $ionicPopup: $ionicPopup, onDismiss: onDismissMsg });
        incControl = new ITPACore.IncControl({ map: map });
        fullyInited = true;
        homeOngoing.ClickOnMapButton(ITPACore.directionsFeatureName);
    }

    function doInit() {
        homeOngoing.OnMapLoaded(map, afterLinesAndStopsAreLoaded);
    }

    function onListAndMapRegistered() {
        if (!!map && !!list) {
            ITPACore.CreateFeatureLayers({
                onUCClick: onHome,
                onBBCClick: onBBC,

                onUserLocationClick: onLocation,
                map: map, baseZIndex: 20,
                onAdd: function (featureName, items) { list.addCards(items); },
                onDel: function (featureName, items) {
                    list.delCards(items);
                    if (featureName == ITPACore.busFeatureName) { lineBusMapControl.Update(); }
                },
                onSelect: function (notification) {
                    var item = itpaFeatureLayers.GetItemFromMapFeature(notification.selected);
                    var timeOutTime = 100;
                    if (item.featureName == ITPACore.busFeatureName) {
                        setCurrentLineFromItem(item);
                        if (showingLines) {
                            showingLines = false;
                            list.showCards(ITPACore.busFeatureName);
                            timeOutTime = 300;
                        }
                    }
                    else if (item.featureName == ITPACore.linesFeatureName) {
                        setCurrentLineFromItem(item);
                        if (!showingLines) {
                            showingLines = true;
                            list.showCards(ITPACore.linesFeatureName);
                            timeOutTime = 300;
                        }
                    }
                    else if (item.featureName == ITPACore.occFeatureName) {
                        item = item.GetData().properties.garageItem;
                    }

                    if (!!item) { setTimeout(function () { list.scrollToItem(item); }, timeOutTime); }
                }
            }, function() {
                itpaFeatureLayers = ITPACore.featureLayers;
                setTimeout(doInit, 500);
            });
        }
    }

    $scope.onSearchKbdGo = function () {
        cordova.plugins.Keyboard.close();
        onSearch();
    }

    $scope.onRegisterMap = function (theMap) {

        map = theMap.map;

        uber = new tf.services.Uber({ serverToken: 'SW4uAK8DDcnW8N99JAa1N2ufif14rylTUR64nt0F', clientId: '3f8josraMAKXEdjxDq3rMF_ihCePSJvA', useDeepLink: false });

        map.SetFractionalZoomInteraction(true);

        var resetNotifications = false;
        //var resetNotifications = true;

        homeNotification = new ITPACore.HomeNotification({ $ionicPopup: $ionicPopup, reset: resetNotifications });

        homeOngoing = new ITPACore.HomeOngoing({
            $http: $http,
            homeNotification: homeNotification,
            geoLocate: GeoLocate, onFeatureRefresh: onFeatureRefreshed,
            onMapButtonClicked: onMapButtonClicked, onETARefresh: onETARefresh, toastr: toastr
        });
        homeInit = new ITPACore.HomeInit({ map: map, onHome: onHome, onBBC: onBBC, onOverview: onOverview, onLocation: onLocation, onStreetLevel: onStreetLevel });
        mapCenter = document.getElementById("mapCenter");
        onListAndMapRegistered();
        map.OnResize();
    }
    $scope.onRegisterList = function (theList) { list = theList; onListAndMapRegistered(); }

    $scope.gotoUCWebSite = function() {
        //button does go to web site functionality, this function called in case future further processing is required
    }
    $scope.onRemoveLoginCredentials = function () {
        ITPACore.DeleteSavedCredentials();
        $scope.hasCredentials = ITPACore.hasCredentialsSaved;
    }
}]);
