"use strict";

ITPACore.FeatureLayer = function (settings) {
    var theThis, featureLayers, map, layer, keyedList, pixelRatio, animatePoints, mapFeature, featureName, keyName,
        getFeatureStyle, refreshStyleOnUpdate, refreshExternalFeatureOnUpdate, preProcessServiceData, featureAddItemFunction, featureUpdateItemFunction,
        featureDelItemFunction, toaster;
    var constantStyle, constantHoverStyle, filterAddCB, addedItems;

    this.GetLayer = function () { return layer; }

    this.OnItemsUpdated = function (notification) { return onUpdated(notification); }

    this.ShowItemsOnMap = function (itemKeys) { return showItemsOnMap(itemKeys); }

    this.Clear = function () { return clear(); }

    this.GetKeyedList = function () { return keyedList; }

    this.GetItemCount = function () { return !!keyedList ? keyedList.GetItemCount() : 0; }

    this.GetKeyedItem = function (key) { return keyedList.GetItem(key); }

    this.GetMapFeature = function (key) {
        var item = theThis.GetKeyedItem(key); return !!item ? tf.js.GetObjProperty(item, ITPACore.itpaObjectName) : undefined;
    }

    this.GetParentLayers = function () { return featureLayers; }

    this.IsLayerVisible = function () { return isLayerVisible(); }
    this.ToggleLayerVisible = function () { return toggleLayerVisible(); }
    this.SetLayerVisible = function (showOrHideBool) { return setLayerVisible(showOrHideBool); }

    function isLayerVisible() { return layer.GetIsVisible(); }

    function setLayerVisible(showOrHideBool) {
        showOrHideBool = !!showOrHideBool;
        layer.SetVisible(showOrHideBool);
        var toastedItem = !showOrHideBool ? toaster.GetToastedItem() : undefined;
        for (var i in addedItems) {
            var item = addedItems[i]; item.isVisible = showOrHideBool ? item.isAddedToLayer : false;
            if (item == toastedItem) { toaster.CloseToast(); }
        }
        return showOrHideBool;
    }

    function toggleLayerVisible() { return setLayerVisible(!isLayerVisible()); }

    this.CreatePointAnimator = function (animationDuration, pointProviders, circleRadius, lineColor) {
        return new tf.map.PointsStyleAnimator({
            maps: [map], pointProviders: pointProviders,
            duration: animationDuration, getStyle: function (elapsed01) {
                var radius = Math.round((circleRadius + Math.pow(elapsed01, 1 / 2) * circleRadius) * pixelRatio) + 2;
                var opacity = 1 - Math.pow(elapsed01, 3);
                var line_width = Math.round(3 - elapsed01);
                var flashStyle = {
                    circle: true,
                    circle_radius: radius,
                    snapToPixel: false,
                    line: true,
                    line_width: line_width,
                    line_color: lineColor,
                    line_opacity: Math.round(opacity * 100)
                };
                return flashStyle;
            }
        });
    }

    this.UpdateFromNewData = function (data) {
        if (data != undefined) {
            if ((data = preProcessServiceData(data)) != undefined) {
                if (!!keyedList) {
                    keyedList.UpdateFromNewData(data);
                }
            }
        }
    }

    this.GetLayer = function () { return layer; }
    this.GetKeyedList = function () { return keyedList; }
    this.GetMap = function () { return map; }

    function checkRefreshExternalFeature(item) {
        if (!!refreshExternalFeatureOnUpdate) {
            var otherFeature = featureLayers.GetMapFeature(refreshExternalFeatureOnUpdate, item.GetKey());
            if (otherFeature) { otherFeature.RefreshStyle(); }
        }
    }

    function doGetStyle(mapFeature, item, isHover) { return function (mapFeature) { return getFeatureStyle(mapFeature, item, isHover); } }

    function logLayer(verb) {

        if (false) {//featureName == ITPACore.busFeatureName || featureName == ITPACore.linesFeatureName) {
            //console.log(featureName + ' after ' + verb + ' has: ' + keyedList.GetItemCount());
        }
    }

    function checkFeatureAddFunction(item) { if (!!featureAddItemFunction) { featureAddItemFunction(item); } }
    function checkFeatureUpdateFunction(item) { if (!!featureUpdateItemFunction) { featureUpdateItemFunction(item); } }
    function checkFeatureDelFunction(item) { if (!!featureDelItemFunction) { featureDelItemFunction(item); } }

    function clear() {
        for (var i in addedItems) { show(addedItems[i], false, true, true); }
        layer.RemoveAllFeatures();
    }

    function showItemsOnMap(itemKeys) {

        if (!itemKeys) {
            itemKeys = keyedList.GetKeyList();
        }
        for (var i in itemKeys) {
            var itemKey = itemKeys[i];
            var item = keyedList.GetItem(itemKey);
            if (!!item) {
                show(item, true, true, false);
            }
        }
        layer.AddWithheldFeatures();
    }

    function show(item, showOrHide, withHoldAddDel, doNotDel) {

        if (!!item && item.mapLayer == layer) {
            if ((showOrHide = !!showOrHide) != item.isAddedToLayer) {
                var itemKey = item.GetKey();
                var mapFeature = tf.js.GetObjProperty(item, ITPACore.itpaObjectName);
                if (showOrHide) {
                    layer.AddMapFeature(mapFeature, withHoldAddDel);
                    if (!!addedItems[itemKey]) {
                        //console.log('featureLayer: adding item already visible ' + featureName);
                    }
                    addedItems[itemKey] = item;
                }
                else {
                    if (!doNotDel) { layer.DelMapFeature(mapFeature, withHoldAddDel); }
                    if (addedItems[itemKey] == undefined) {
                        //console.log('featureLayer: deleting item already invisible ' + featureName);
                    }
                    delete addedItems[itemKey];
                }
            }
            if (item.isAddedToLayer = showOrHide) {
                item.isVisible = layer.GetIsVisible();
            }
            else { item.isVisible = false; }
        }
    }

    function onAdded(notification) {

        for (var i in notification.items) {
            var item = notification.items[i], itemData = item.GetData();
            var geometry = itemData.geometry;
            if (!!constantStyle) {
                geometry.style = constantStyle;
                geometry.hoverStyle = constantHoverStyle;
            }
            else { geometry.style = doGetStyle(mapFeature, item, false); geometry.hoverStyle = doGetStyle(mapFeature, item, true); }

            if (featureName != ITPACore.stopsFeatureName) {
                var mapFeature = new tf.map.Feature(geometry);
                tf.js.SetObjProperty(item, ITPACore.itpaObjectName, mapFeature);
                tf.js.SetObjProperty(mapFeature, ITPACore.itpaObjectName, item);
            }

            item.mapLayer = layer;
            item.isAddedToLayer = false;
            item.isVisible = false;

            var doAddToLayer = (!!filterAddCB) ? filterAddCB(item) : true;

            if (doAddToLayer) { show(item, true, true, false); }
            checkFeatureAddFunction(item);
            checkFeatureUpdateFunction(item);
            checkRefreshExternalFeature(item);
            //console.log('adding feature ' + featureName + ' with ' + geometry.coordinates.length + ' points');
        }
        layer.AddWithheldFeatures();
        featureLayers.OnAdd(featureName, notification.items);
        //logLayer('add');
    }

    function onDeleted(notification) {
        var toastedItem = toaster.GetToastedItem(), needsToastDel;
        for (var i in notification.items) {
            var item = notification.items[i];
            if (item.isAddedToLayer) { show(item, false, true, false); }
            checkFeatureDelFunction(item);
            if (item == toastedItem) {
                if (needsToastDel) {
                    //console.log('double toast del for item: ' + item.featureName + ' ' + item.GetKey());
                }
                needsToastDel = true;
            }
        }
        layer.DelWithheldFeatures();
        if (needsToastDel) { toaster.CloseToast(); }
        //setTimeout(function() {featureLayers.OnDel(featureName, notification.items)}, 100);
        featureLayers.OnDel(featureName, notification.items);
        //logLayer('del');
    }

    function onUpdated(notification) {
        var pointProviders = [];
        var toastedItem = toaster.GetToastedItem(), needsToastUpdate;
        for (var i in notification.items) {
            var item = notification.items[i], itemData = item.GetData();
            var geometry = itemData.geometry;
            var mapFeature = tf.js.GetObjProperty(item, ITPACore.itpaObjectName);
            if (mapFeature) {
                if (refreshStyleOnUpdate) { ITPACore.RefreshMapFeatureStyle(item, mapFeature); }
                if (mapFeature.GetIsPoint()) {
                    var nowCoords = mapFeature.GetPointCoords();
                    if (nowCoords[0] != geometry.coordinates[0] || nowCoords[1] != geometry.coordinates[1]) {
                        mapFeature.SetPointCoords(geometry.coordinates);
                        if (featureName == ITPACore.busFeatureName) {
                            var curBus = ITPACore.featureLayers.GetKeyedItem(ITPACore.busFeatureName, item.GetKey());
                            if (curBus.isVisible) {
                                pointProviders.push(geometry.coordinates);
                            }
                        }
                    }
                }
                else {
                    mapFeature.SetGeom(new tf.map.FeatureGeom(geometry));
                }
            }
            checkFeatureUpdateFunction(item);
            checkRefreshExternalFeature(item);
            if (item == toastedItem) {
                if (needsToastUpdate) {
                    //console.log('double toast update for item: ' + item.featureName + ' ' + item.GetKey());
                }
                needsToastUpdate = true;
            }
        }
        if (needsToastUpdate) { toaster.OnUpdateToastedItem(); }
        if (pointProviders.length > 0) {
            if (!!animatePoints) { animatePoints(pointProviders, pixelRatio); }
            else {
                theThis.CreatePointAnimator(1000, pointProviders, 12, "#c00");
            }
        }
        //logLayer('upd');
        featureLayers.OnUpdate(featureName, notification.items);
    }

    /*function refreshFeature() {
        if (!!mapFeature) { layer.DelMapFeature(mapFeature); mapFeature = null; }
        var items = keyedList.GetKeyedItemList();
        var coords = [];

        for (var i in items) {
            var item = items[i], data = item.GetData(), geom = data.geometry;
            coords.push(geom.coordinates);
        }
        if (coords.length > 0) {
            //console.log('adding feature ' + featureName + ' with ' + coords.length + ' points');
            mapFeature = new tf.map.Feature({ type: "multipoint", coordinates: coords, style: settings.getStyle });
            layer.AddMapFeature(mapFeature);
        }
    }*/

    function initialize() {
        settings = tf.js.GetValidObjectFrom(settings);
        if (tf.js.GetIsInstanceOf(settings.map, tf.map.Map) && tf.js.GetIsInstanceOf(settings.featureLayers, ITPACore.FeatureLayers)) {
            addedItems = {};
            featureLayers = settings.featureLayers;
            toaster = ITPACore.mapFeatureToaster;
            featureName = settings.featureName;
            filterAddCB = tf.js.GetFunctionOrNull(settings.filterAdd);
            preProcessServiceData = ITPACore.GetFeaturePreProcessServiceData(featureName);
            pixelRatio = tf.browser.GetDevicePixelRatio();
            animatePoints = tf.js.GetFunctionOrNull(settings.animatePoints);
            map = settings.map;
            var addLayerSettings = {
                name: ITPACore.GetLayerName(featureName), isVisible: false, isHidden: true, useClusters: false,
                zIndex: ITPACore.GetLayerZIndex(featureName) + tf.js.GetIntNumberInRange(settings.baseZIndex, 0, 99999, 0),
                minMaxLevels: ITPACore.GetFeatureLayerMinMaxLevels(featureName)
            };

            /*if (featureName == ITPACore.stopsFeatureName) {
                addLayerSettings.useClusters = true;
                addLayerSettings.clusterFeatureDistance = 30;
                //addLayerSettings.clusterStyle = { circle: true, circle_radius: 8, fill: true, fill_color: "#f00" };
                addLayerSettings.clusterStyle = { icon: true, icon_url: "./img/station-clustered.svg", snapToPixel: false, icon_anchor: [0.5, 0.5], scale: 1.2, zindex: 2 }
            }*/

            layer = map.AddFeatureLayer(addLayerSettings);
            keyName = ITPACore.GetKeyName(featureName);
            getFeatureStyle = ITPACore.GetFeatureStyle(featureName);

            if (!!settings.useConstantStyle) {
                constantStyle = doGetStyle(undefined, undefined, false)();
                constantHoverStyle = doGetStyle(undefined, undefined, true)();
                //console.log('featureLayer: using constant style ' + featureName);
            }

            refreshStyleOnUpdate = ITPACore.GetFeatureRefreshStyleOnUpdate(featureName);
            refreshExternalFeatureOnUpdate = ITPACore.GetExternalFeatureRefreshStyleOnUpdate(featureName);
            featureAddItemFunction = ITPACore.GetAddFeatureItemFunction(featureName);
            featureDelItemFunction = ITPACore.GetDelFeatureItemFunction(featureName);
            featureUpdateItemFunction = ITPACore.GetUpdateFeatureItemFunction(featureName);
            keyedList = new tf.js.KeyedList({
                name: featureName,
                getKeyFromItemData: function (itemData) {
                    return tf.js.GetIsValidObject(itemData) ? itemData.properties[keyName] : null;
                },
                needsUpdateItemData: ITPACore.GetNeedsUpdateItemData(featureName),
                filterAddItem: ITPACore.GetFeatureFilterAddItems(featureName)
            });

            keyedList.AddListener(tf.consts.keyedListDeletedItemsEvent, onDeleted);
            keyedList.AddListener(tf.consts.keyedListAddedItemsEvent, onAdded);
            keyedList.AddListener(tf.consts.keyedListUpdatedItemsEvent, onUpdated);
            //keyedList.NotifyItemsAdded(onAdded);
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
}

ITPACore.FeatureLayers = function (settings) {
    var theThis, featureLayers, map, mapFeatureToaster, directionsLayer, overviewLayer, topLayer, searchLayer;
    var geoCodeFeature, UCFeature, BBCFeature, userLocationFeature, onAddCB, onUpdateCB, onDelCB, lastSelected;
    var onSelectCB, onUCClickCB, onBBCClickCB, onUserLocationClickCB, currentLineId, queryStr, currentLine, currentLineMapFeature, showingAllLines;

    this.ShowHideFeatureLayers = function (showThese) {
        for (var i in featureLayers) {
            var fl = featureLayers[i];
            var isVisible = (!!showThese) ? ((showThese.indexOf(i) != -1) ? true : false) : false;
            fl.SetLayerVisible(isVisible);
        }
    }

    this.GetGeoCodeFeature = function () { return geoCodeFeature; }
    this.GeoCode = function (addressStr, then) { return geoCode(addressStr, then); }

    this.GetQueryStr = function () { return queryStr; }
    this.SetQueryStr = function (newQueryStr) { queryStr = newQueryStr; }

    this.GetMap = function() { return map; }

    this.ShowAllLines = function (showBool) { return showAllLines(showBool); }
    this.GetShowAllLines = function () { return showingAllLines; }

    this.SetCurrentLine = function (currentLineId) {
        return setCurrentLine(currentLineId);
    };
    this.GetCurrentLine = function () { return currentLineId; }

    this.GetCurrentLineItem = function () {
        var featureLayer = theThis.GetFeatureLayer(ITPACore.linesFeatureName);
        return (!!featureLayer) ? featureLayer.GetKeyedItem(currentLineId) : undefined;
    }

    this.SetUserLocation = function (pointCoords) { return setUserLocation(pointCoords); }

    this.OnAdd = function (featureName, items) {
        switch (featureName) {
            case ITPACore.busFeatureName:
                for (var i in items) {
                    var item = items[i];
                    var lineItem = item.lineItem;//ITPACore.featureLayers.GetKeyedItem(ITPACore.linesFeatureName, item.GetData().properties.line_id);
                    if (lineItem) { addBusToLine(lineItem, item); }
                }
                break;
            default:
                break;
        }
        if (onAddCB) { onAddCB(featureName, items); }
    }

    this.OnUpdate = function (featureName, items) {
        var needsBusLayerRefresh;
        switch (featureName) {
            case ITPACore.busFeatureName:
                for (var i in items) {
                    var item = items[i];
                    var lineItem = item.lineItem;//ITPACore.featureLayers.GetKeyedItem(ITPACore.linesFeatureName, item.GetData().properties.line_id);
                    var prevLineItem = item.prevLineItem;
                    if (prevLineItem != lineItem) {
                        var lineFrom = !!prevLineItem ? prevLineItem.GetData().properties.line_id : "none";
                        var lineTo = !!lineItem ? lineItem.GetData().properties.line_id : "none";
                        //console.log("bus: " + item.GetKey() + " changed lines from " + lineFrom + " to " + lineTo + " at " + item.GetData().properties.datetime);
                        if (!!prevLineItem) { delBusFromLine(prevLineItem, item); item.prevLineItem = lineItem; }
                        if (lineItem) { addBusToLine(lineItem, item); }
                        if (!needsBusLayerRefresh) {
                            if (currentLine) {
                                needsBusLayerRefresh = lineItem == currentLine || prevLineItem == currentLine;
                            }
                        }
                    }
                }
                if (needsBusLayerRefresh) {
                    //console.log("bus line change prompted bus layer refresh");
                    var busLayer = theThis.GetFeatureLayer(ITPACore.busFeatureName);
                    busLayer.Clear();
                    busLayer.ShowItemsOnMap(currentLine.busKeyList);
                    updateToastedItem();
                }
                break;
            default:
                break;
        }
        if (onUpdateCB) { onUpdateCB(featureName, items); }
    }

    this.OnDel = function (featureName, items) {
        switch (featureName) {
            case ITPACore.busFeatureName:
                for (var i in items) {
                    var item = items[i];
                    var lineItem = item.lineItem;//ITPACore.featureLayers.GetKeyedItem(ITPACore.linesFeatureName, item.GetData().properties.line_id);
                    if (lineItem) { delBusFromLine(lineItem, item); }
                }
                break;
            default:
                break;
        }
        if (onDelCB) { onDelCB(featureName, items); }
    }

    this.GetLastSelected = function () { return lastSelected; }
    this.UnSelectLast = function () { return unselectLast(); }
    this.Select = function (mapFeature, bypassNotification) { return select(mapFeature, bypassNotification); }
    this.Toast = function (mapFeature, pointCoords) { return toast(mapFeature, pointCoords); }
    this.SelectAndToast = function (mapFeature, pointCoords) { return selectAndToast(mapFeature, pointCoords); }

    this.GetTopLayer = function () { return topLayer; }
    this.GetOverviewLayer = function () { return overviewLayer; }

    this.GetFeatureLayer = function (featureName) { return featureLayers[featureName]; }

    this.GetKeyedList = function (featureName) {
        var featureLayer = theThis.GetFeatureLayer(featureName);
        return (!!featureLayer) ? featureLayer.GetKeyedList() : false;
    }

    this.GetItemCount = function (featureName) {
        var featureLayer = theThis.GetFeatureLayer(featureName);
        return (!!featureLayer) ? featureLayer.GetItemCount() : 0;
    }

    this.GetKeyedItem = function (featureName, key) {
        var featureLayer = theThis.GetFeatureLayer(featureName);
        return (!!featureLayer) ? featureLayer.GetKeyedItem(key) : undefined;
    }

    this.GetMapFeature = function (featureName, key) {
        var featureLayer = theThis.GetFeatureLayer(featureName);
        return (!!featureLayer) ? featureLayer.GetMapFeature(key) : undefined;
    }

    this.GetItemFromMapFeature = function (mapFeature) {
        return tf.js.GetObjProperty(mapFeature, ITPACore.itpaObjectName);
    }

    this.GetMapFeatureFromItem = function (item) {
        return tf.js.GetObjProperty(item, ITPACore.itpaObjectName);
    }

    this.GetItemFeatureName = function (item) {
        return item.featureName;
        /*var featureName;
        if (tf.js.GetIsInstanceOf(item, tf.js.KeyedItem)) {
            featureName = item.GetList().GetName();
        }
        return featureName;*/
    }

    this.GetMapFeatureFeatureName = function (mapFeature) {
        return theThis.GetItemFeatureName(theThis.GetItemFromMapFeature(mapFeature));
    }

    this.ToggleLayer = function (featureName) {
        var featureLayer = theThis.GetFeatureLayer(featureName);
        return (!!featureLayer) ? featureLayer.ToggleLayerVisible() : false;
    }

    this.ShowLayer = function (featureName, showOrHideBool) {
        var featureLayer = theThis.GetFeatureLayer(featureName);
        return !!featureLayer ? featureLayer.SetLayerVisible(showOrHideBool) : false;
    }

    this.IsLayerShowing = function (featureName) {
        var featureLayer = theThis.GetFeatureLayer(featureName);
        return !!featureLayer ? featureLayer.IsLayerVisible() : false;
    }

    this.UpdateFromNewData = function (featureName, data) {
        var featureLayer = theThis.GetFeatureLayer(featureName);
        if (!!featureLayer) { featureLayer.UpdateFromNewData(data); }
    }

    function unselectLast() {
        if (!!lastSelected) {
            if (lastSelected != currentLineMapFeature) { lastSelected.SetIsAlwaysInHover(false); }
            lastSelected = undefined;
        }
    }
    function select(mapFeature, bypassNotification) {
        var lastSaved = lastSelected;
        unselectLast();
        if (!!mapFeature) {
            (lastSelected = mapFeature).SetIsAlwaysInHover(true);
        }
        if (!bypassNotification) {
            if (!!onSelectCB) { onSelectCB({ sender: theThis, last: lastSaved, selected: lastSelected }); }
        }
    }

    function IsBusInLine(lineItem, busItem) { return lineItem.busList[busItem.GetKey()] != undefined; }

    function addBusToLine(lineItem, busItem) {
        if (!IsBusInLine(lineItem, busItem)) {
            var key = busItem.GetKey();
            lineItem.busList[key] = busItem;
            lineItem.busKeyList[key] = key;
            ++lineItem.nBuses;
            ITPACore.GetUpdateFeatureItemFunction(ITPACore.linesFeatureName)(lineItem);
        }
    }

    function delBusFromLine(lineItem, busItem) {
        if (IsBusInLine(lineItem, busItem)) {
            var key = busItem.GetKey();
            delete lineItem.busList[key];
            delete lineItem.busKeyList[key];
            --lineItem.nBuses;
            ITPACore.GetUpdateFeatureItemFunction(ITPACore.linesFeatureName)(lineItem);
        }
    }

    function toast(mapFeature, pointCoords) { mapFeatureToaster.ShowToast(mapFeature, pointCoords); }

    function selectAndToast(mapFeature, pointCoords) { toast(mapFeature, pointCoords); select(mapFeature, false); }

    function onFeatureClick(notification) {
        var mapFeature = notification.mapFeature;
        var item = theThis.GetItemFromMapFeature(mapFeature);
        if (!!item) {
            if (item.featureName != ITPACore.stopsFeatureName) {
                //if (item.featureName == ITPACore.busFeatureName) { console.log(item.GetData().properties.heading); }
                if (item.featureName == ITPACore.linesFeatureName) { select(mapFeature, false); }
                else { selectAndToast(mapFeature, notification.eventCoords); }
            }
        }
        else if (mapFeature == UCFeature) { if (!!onUCClickCB) { onUCClickCB(); } }
        else if (mapFeature == BBCFeature) { if (!!onBBCClickCB) { onBBCClickCB(); } }
        else if (mapFeature == userLocationFeature) { if (!!onUserLocationClickCB) { onUserLocationClickCB(); } }
    }

    function setUserLocation(pointCoords) {
        if (tf.js.GetIsArrayWithMinLength(pointCoords, 2)) {
            if (userLocationFeature == undefined) {
                userLocationFeature = new tf.map.Feature({
                    type: "point", coordinates: pointCoords, style: ITPACore.GetUserLocationFeatureStyle()
                });
                topLayer.AddMapFeature(userLocationFeature);
            }
            else {
                userLocationFeature.SetPointCoords(pointCoords);
            }
        }
        else {
            topLayer.DelMapFeature(userLocationFeature);
            userLocationFeature = undefined;
        }
    }

    function isBusItem(item) { return item.featureName == ITPACore.busFeatureName; }
    function isStopItem(item) { return item.featureName == ITPACore.stopsFeatureHoverStyle; }
    function isLineItem(item) { return item.featureName == ITPACore.linesFeatureName; }

    function filterCurrentLineBuses(item) {
        if (!showingAllLines) {
            if (!!item) {
                var data = item.GetData();
                return data.properties.line_id == currentLineId;
            }
            return false;
        }
        return true;
    }

    function updateToastedItem() {
        var toastedItem = mapFeatureToaster.GetToastedItem();
        if (toastedItem) {
            if (!toastedItem.isVisible) { mapFeatureToaster.CloseToast(); }
            else { mapFeatureToaster.OnUpdateToastedItem(); }
        }
    }

    function showAllLines(showBool) {
        if (showingAllLines != (showBool = !!showBool)) {
            showingAllLines = showBool;
            setCurrentLine(currentLineId, true);
            /*var linesLayer = theThis.GetFeatureLayer(ITPACore.linesFeatureName);
            if (showingAllLines = showBool) {
                linesLayer.ShowItemsOnMap();
            }
            else {
                linesLayer.Clear();
                if (currentLineId != undefined) { linesLayer.ShowItemsOnMap([currentLineId]); }
            }
            updateToastedItem();*/
        }
    }

    function setCurrentLineOnHover(setBool) { if (currentLineMapFeature) { currentLineMapFeature.SetIsAlwaysInHover(setBool); } }

    function setCurrentLine(currentLineIdSet, forceBool) {
        //if (tf.js.GetIsNonEmptyString(currentLineIdSet)) { currentLineIdSet = parseInt(currentLineIdSet); }
        if ((currentLineId != currentLineIdSet) || !!forceBool) {
            var linesLayer = theThis.GetFeatureLayer(ITPACore.linesFeatureName);
            //var stopsLayer = theThis.GetFeatureLayer(ITPACore.stopsFeatureName);
            var busLayer = theThis.GetFeatureLayer(ITPACore.busFeatureName);
            var line = linesLayer.GetKeyedItem(currentLineIdSet);
            setCurrentLineOnHover(false);
            if (!showingAllLines) {
                linesLayer.Clear();
                //stopsLayer.Clear(); 
                busLayer.Clear();
                if (!!line) {
                    linesLayer.ShowItemsOnMap([currentLineIdSet]);
                }
                //stopsLayer.ShowItemsOnMap(line.GetData().properties.platform_ids);
                busLayer.ShowItemsOnMap(line.busKeyList);
            }
            else {
                busLayer.ShowItemsOnMap();
                linesLayer.ShowItemsOnMap();
            }
            if (!!line) {
                currentLineId = currentLineIdSet;
                currentLine = line;
                currentLineMapFeature = theThis.GetMapFeatureFromItem(currentLine);
                setCurrentLineOnHover(true);
            }
            else {
                currentLineId = undefined;
                currentLine = undefined;
                currentLineMapFeature = undefined;
            }
            updateToastedItem();
        }
    }

    /*function onZoomClose(notification) {
        var centerCoords = !!notification.mapFeature ? notification.mapFeature.GetPointCoords() : notification.eventCoords;
        map.SetCenter(centerCoords);
        map.SetLevel(ITPACore.mapMaxLevel - 1);
    }*/

    function geoCode(addressStr, then) {
        if (!!geoCodeFeature) { searchLayer.DelMapFeature(geoCodeFeature); geoCodeFeature = undefined; }

        if (tf.js.GetIsNonEmptyString(addressStr)) {
            ITPACore.GeoCodeAddress(addressStr, function (data) {
                var result = false;
                if (!!data) {
                    if (tf.js.GetIsArrayWithMinLength(data.pointCoords, 2) && ITPACore.AreMapCoordsInsideExtent(data.pointCoords)) {
                        var style = ITPACore.GetGeoCodeFeatureStyleSpecs(false);
                        var textStyle = {
                            marker: true, label: addressStr, font_height: 15, zindex: 10, marker_color: "#ffa",
                            font_color: "#008",
                            line_width: 1, line_color: "#ffffff", marker_opacity: 85, border_opacity: 60, border_color: "#000"
                        };
                        var hoverStyle = ITPACore.GetGeoCodeFeatureStyleSpecs(true);
                        hoverStyle.push(textStyle);
                        var geom = { type: 'point', style: style, hoverStyle: hoverStyle, coordinates: data.pointCoords }

                        searchLayer.AddMapFeature(geoCodeFeature = new tf.map.Feature(geom));
                        geoCodeFeature.SetOnClickListener(function () { geoCodeFeature.SetIsAlwaysInHover(!geoCodeFeature.GetIsAlwaysInHover()); });
                        result = true;
                    }
                }
                if (tf.js.GetFunctionOrNull(then)) {
                    then({ sender: theThis, status: result });
                }
            });
        }
    }

    function initialize() {
        settings = tf.js.GetValidObjectFrom(settings);
        showingAllLines = true;
        if (tf.js.GetIsInstanceOf(settings.map, tf.map.Map)) {
            onAddCB = tf.js.GetFunctionOrNull(settings.onAdd);
            onUpdateCB = tf.js.GetFunctionOrNull(settings.onUpdate);
            onDelCB = tf.js.GetFunctionOrNull(settings.onDel);
            onSelectCB = tf.js.GetFunctionOrNull(settings.onSelect);
            onUCClickCB = tf.js.GetFunctionOrNull(settings.onUCClick);
            onBBCClickCB = tf.js.GetFunctionOrNull(settings.onBBCClick);
            onUserLocationClickCB = tf.js.GetFunctionOrNull(settings.onUserLocationClick);
            var featureNames = ITPACore.GetFeaturesWithMapLayersNames();
            featureLayers = {};
            ITPACore.CreateMapFeatureToaster(map = settings.map);
            mapFeatureToaster = ITPACore.mapFeatureToaster;
            //map.AddListener(tf.consts.mapDblClickEvent, onZoomClose);
            //map.AddListener(tf.consts.mapFeatureDblClickEvent, onZoomClose);
            map.AddListener(tf.consts.mapFeatureClickEvent, onFeatureClick);

            var baseZIndex = tf.js.GetIntNumberInRange(settings.baseZIndex, 0, 99999, 0);

            for (var i in featureNames) {
                var featureName = featureNames[i];
                var useConstantStyle = undefined;
                var filterAdd = undefined;

                switch (featureName) {
                    //case ITPACore.msgFeatureName:
                    //case ITPACore.incFeatureName:
                    //case ITPACore.busFeatureName:
                    case ITPACore.stopsFeatureName:
                    case ITPACore.searchFeatureName:
                        useConstantStyle = true;
                        break;
                    default:
                        break;
                }

                switch (featureName) {
                    case ITPACore.linesFeatureName:
                        break;
                    case ITPACore.busFeatureName:
                        filterAdd = filterCurrentLineBuses;
                        break;
                    case ITPACore.stopsFeatureName:
                        filterAdd = function () { return false; }
                        break;
                    default:
                        break;
                }

                featureLayers[featureName] = new ITPACore.FeatureLayer({
                    map: map, featureName: featureName, featureLayers: theThis,
                    baseZIndex: baseZIndex,
                    useConstantStyle: useConstantStyle,
                    filterAdd: filterAdd
                });
            }

            var zIndexAboveFeatureLayers = baseZIndex + 5;

            var directionsLayerSettings = {
                name: "Directions", isVisible: false, isHidden: true, useClusters: false,
                zIndex: zIndexAboveFeatureLayers++
            };

            var overviewLayerSettings = {
                name: "Overview", isVisible: true, isHidden: true, useClusters: false,
                zIndex: zIndexAboveFeatureLayers++,
                minMaxLevels: { maxLevel: ITPACore.minLevelBeforeUCFeature, minLevel: tf.consts.minLevel }
            };

            var topLayerSettings = {
                name: "Top", isVisible: true, isHidden: true, useClusters: false,
                zIndex: zIndexAboveFeatureLayers++
            };

            searchLayer = theThis.GetFeatureLayer(ITPACore.searchFeatureName).GetLayer();

            UCFeature = new tf.map.Feature({ type: "point", coordinates: ITPACore.mapHomeCenter, style: ITPACore.GetUCFeatureStyle() });
            BBCFeature = new tf.map.Feature({ type: "point", coordinates: ITPACore.mapBBCCenter, style: ITPACore.GetBBCFeatureStyle() });

            directionsLayer = map.AddFeatureLayer(directionsLayerSettings);

            overviewLayer = map.AddFeatureLayer(overviewLayerSettings);
            overviewLayer.AddMapFeature(UCFeature);

            overviewLayer.AddMapFeature(BBCFeature);
            topLayer = map.AddFeatureLayer(topLayerSettings);
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
