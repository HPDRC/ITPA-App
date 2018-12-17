"use strict";

ITPACore.MapETAToaster = function (settings) {
    var theThis, tfStyles, etaToastList, layer, toastedItem;
    var eventDispatcher;
    var allEventName = "all";
    var lastETAClicked;

    this.OnFirst = function() { return onFirst(); }
    this.OnNextPrev = function (isNext) { return onNextPrev(isNext); }

    this.GetLastETAClicked = function () { return lastETAClicked; }
    this.Toast = function (toastedItem) { return toast(toastedItem); }
    this.Clear = function () { return clear(); }

    this.AddListener = function (callBack) { return eventDispatcher.AddListener(allEventName, callBack); }

    function onFirst() { if (lastETAClicked != undefined) { setLastETAClicked(etaToastList[0]); } }

    function onNextPrev(isNext) {
        if (lastETAClicked != undefined) {
            var index = lastETAClicked.index, len = etaToastList.length;

            if (isNext) { if (++index >= len) { index = 0; } }
            else { if (--index < 0) { index = len - 1; } }
            setLastETAClicked(etaToastList[index]);
        }
    }

    function unHoverLastETAClicked() {
        if (lastETAClicked != undefined) {
            var st = lastETAClicked.stopMapFeature;
            if (!!st) { lastETAClicked.stopMapFeature.SetIsAlwaysInHover(false); }
            //else { console.log('lastETAClicked has invalid mapFeature'); }
        }
    }

    function hoverLastETAClicked() {
        if (lastETAClicked != undefined) {
            var stopMapFeature = lastETAClicked.stopMapFeature;
            if (!!stopMapFeature) { stopMapFeature.SetIsAlwaysInHover(true); }
        }
    }

    function setLastETAClicked(eta) {
        unHoverLastETAClicked();
        lastETAClicked = eta;
        hoverLastETAClicked();
        notifyLastEtaClicked();
    }

    function notifyLastEtaClicked() { notify({ eta: lastETAClicked }); }

    function onETAClicked(notification) {
        var mapFeature = notification.mapFeature;
        var stopItem = !!mapFeature ? mapFeature.stopItem : undefined;
        if (!!stopItem) {
            var stopETAFeatures = stopItem.stopETAFeatures;
            if (!!stopETAFeatures && stopETAFeatures.index < etaToastList.length) {
                setLastETAClicked(etaToastList[stopETAFeatures.index]);
            }
        }
    }

    function notify(data) { eventDispatcher.Notify(allEventName, data); }

    function toast(toastedItemSet) {
        var etaListSet;
        if (!!(toastedItem = toastedItemSet)) {
            etaListSet = toastedItem.etaList;
        }
        toastETAList(etaListSet);
    }

    function toastETAList(etaList) {
        var lastStopItemSaved = !!lastETAClicked ? lastETAClicked.stopItem : undefined;
        clear();
        if (etaList != undefined) {
            layer = ITPACore.featureLayers.GetFeatureLayer(ITPACore.stopsFeatureName).GetLayer();
            //console.log('eta toast show');
            //var localEtas = etaList.etas.slice(0);
            var localEtas = etaList.etas;
            etaToastList = [];
            var index = 0;
            for (var i in localEtas) {
                var etaItem = localEtas[i];
                var stopItem = etaItem.stopItem;
                var stopETAFeatures = stopItem.stopETAFeatures;
                var stopMapFeature;

                if (stopETAFeatures == undefined) {
                    stopItem.stopETAFeatures = stopETAFeatures = { stopItem: stopItem };
                }
                else {
                    stopMapFeature = stopETAFeatures.stopMapFeature;
                }

                stopETAFeatures.index = index;
                stopETAFeatures.etaItem = etaItem;

                if (!!stopMapFeature) {
                    stopMapFeature.RefreshStyle();
                }
                else {
                    var d = stopItem.GetData(), g = d.geometry;
                    g.style = getGetStopStyle(stopItem, false);
                    g.hoverStyle = getGetStopStyle(stopItem, true);
                    stopETAFeatures.stopMapFeature = stopMapFeature = new tf.map.Feature(g);
                    stopETAFeatures.stopMapFeature.stopItem = stopItem;

                    tf.js.SetObjProperty(stopItem, ITPACore.itpaObjectName, stopMapFeature);
                    tf.js.SetObjProperty(stopMapFeature, ITPACore.itpaObjectName, stopItem);

                    stopMapFeature.SetOnClickListener(onETAClicked);
                }

                layer.AddMapFeature(stopMapFeature, true);
                etaToastList.push(stopItem.stopETAFeatures);

                if (lastStopItemSaved == stopItem) {
                    lastETAClicked = etaToastList[index];
                }

                ++index;
            }
            layer.AddWithheldFeatures();
            if (lastETAClicked == undefined && index > 0) { lastETAClicked = etaToastList[0]; }
            hoverLastETAClicked();
        }
    }

    function clear() {
        if (!!layer) { layer.RemoveAllFeatures(); }
        unHoverLastETAClicked();
        lastETAClicked = undefined;
        etaToastList = [];
    }

    function getETAStyle(stopItem, isHover) {
        var etaStr;
        if (stopItem != undefined) {
            etaStr = ITPACore.getAmPmHour(stopItem.stopETAFeatures.etaItem.eta);
        }
        else {
            etaStr = "??:??";
        }
        //var etaStr = ITPACore.getAmPmHour(etaItem.eta);
        return {
            marker: true, label: etaStr, font_height: isHover ? 18 : 15, zindex: isHover ? 6 : 1, marker_color: isHover ? "#ffa" : ITPACore.stopBkColor, font_color: isHover ? "#008" : "#008",
            line_width: isHover ? 2 : 1, line_color: "#ffffff", marker_opacity: isHover ? 100 : 85, border_opacity: 60, border_color: "#000"
        };
    }

    function getGetStopStyle(stopItem, isHover) { return function (mapFeature) { return getETAStyle(stopItem, isHover); } }

    function initialize() {
        eventDispatcher = new tf.events.MultiEventNotifier({ eventNames: [allEventName] });
        settings = tf.js.GetValidObjectFrom(settings);
        etaToastList = [];
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
