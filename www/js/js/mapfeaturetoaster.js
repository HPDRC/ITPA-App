"use strict";

ITPACore.MapFeatureToaster = function (settings) {
    var theThis, tfStyles, map, mapHTMLOverlay, toastFncs, onDelayCloseToast, toastShouldAutoClose, onClickListener, styles, baseOverlayContainerStyles;
    var busContainer, msgContainer, incContainer, occContainer, ssgContainer, stpContainer, linContainer, searchContainer, directionsContainer, toastedItem, toastedMapFeature,
        toastedContainer, toastedPointCoords, mapETAToaster;
    var eventDispatcher;
    var allEventName = "all";

    this.AddListener = function (callBack) { return eventDispatcher.AddListener(allEventName, callBack); }

    this.GetToastedMapFeature = function () { return toastedMapFeature; }
    this.GetToastedItem = function () { return toastedItem; }
    this.CloseToast = function () { toastShouldAutoClose = true; return onDelayCloseToast.CallBackNow(); }
    this.OnUpdateToastedItem = function () { return onUpdateToastedItem(false); }

    this.GetStyle = function (featureName) { return styles[featureName]; }

    this.ShowToast = function (mapFeature, pointCoords) {
        var featureName = ITPACore.featureLayers.GetMapFeatureFeatureName(mapFeature);
        //console.log('toasting: ' + featureName);
        var f = toastFncs[featureName];
        if (!!f) {
            f(mapFeature, pointCoords);
            notify("show");
        }
        else {
            //console.log('toasting: ' + featureName);
        }
    }

    function notify(status) { eventDispatcher.Notify(allEventName, { status: status, toastedItem: toastedItem }); }

    function closeToast() {
        if (toastShouldAutoClose) {
            if (mapHTMLOverlay.GetIsVisible()) { mapHTMLOverlay.SetVisible(false); }
            mapETAToaster.Clear();
            if (!!toastedMapFeature) {
                ITPACore.featureLayers.UnSelectLast();
            }
            toastedItem = toastedMapFeature = undefined;
            notify("close");
        }
    }

    function getHTMLFromItem(item) {
        var innerHTML = "";

        if (!!item) {
            var props = item.GetData().properties;
            if (!!props) {
                switch (ITPACore.featureLayers.GetItemFeatureName(item)) {
                    case ITPACore.busFeatureName:
                        //{"datetime":"2016-06-15 12:28:58.0","heading":"267","line_id":"13","public_transport_vehicle_id":"4011187","speed":"0.0"}
                        var msg = item.msg;

                        //props.number_of_occupants = 40 * 1000 + 19;

                        if (props.number_of_occupants != 0) {
                            var ocp;
                            if (props.number_of_occupants > 1000) {
                                var occupants = props.number_of_occupants % 1000;
                                var capacity = Math.floor(props.number_of_occupants / 1000);
                                if (capacity > 0) {
                                    ocp = ((occupants / capacity) * 100).toFixed(0) + '%';
                                }
                            }
                            else {
                                ocp = ((props.number_of_occupants) / 10).toFixed(0) + '%';
                            }
                            if (!!ocp) {
                                msg += '<br />' + ocp + ' full';
                            }
                        }
                        innerHTML = '<div style=\'text-align: center;\'>' + item.title + '<br/><div style="font-size: 90%;font-style: italic;">' + msg + '</div></div>';
                        break;
                    case ITPACore.stopsFeatureName:
                        //{"identifier":"W FLAGLER ST@NW 58 AV","platform_id":"1295"}
                        innerHTML = item.title + '<br/><div style="font-size: 90%;font-style: italic;">' + item.msg + '</div>';
                        /*innerHTML = 'Stop #' + item.GetKey();
                        innerHTML += '<div style="font-size: 80%;">' +
                            props.identifier +
                        '</div>';*/
                        break;
                    case ITPACore.msgFeatureName:
                        innerHTML = item.longTitle + '<br/><div style="font-size: 90%;font-style: italic;">' + item.msg + '</div>';
                        break;
                    case ITPACore.incFeatureName:
                        innerHTML = item.title + '<br/><div style="font-size: 90%;font-style: italic;">' + item.msg + '</div>';
                        break;
                    case ITPACore.garFeatureName:
                        innerHTML = item.title + '<br/><div style="font-size: 90%;font-style: italic;">' + item.msg + '</div>';
                        break;
                    case ITPACore.ssgFeatureName:
                        var percentage = props.text;
                        innerHTML = 'On street parking areas with estimated <span style="font-weight: bold; color: #03b;">' + percentage + '</span> vacancy<br/>';
                        innerHTML += '<span style="font-size: 80%; font-style: italic;">(preliminary estimation based on pre-release crowd-sourced data)</span>'; 
                        break;
                    case ITPACore.occFeatureName:
                        var garageItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.garFeatureName, item.GetKey());
                        //var garageProps = !!garageItem ? garageItem.GetData().properties : undefined;
                        //var garageName = !!garageProps ? (garageProps.identifier + '<br>') : '';
                        /*
                        {"parking_area_id":"1A", "occupancy_percentage":"0.5200", "parking_space_left":"240", "occupancy":"260", "lastupdate":"2016-01-19 11:16:09.0", "parking_site_id":"1", "parking_level_id":"1", "parking_class_id":"1", "capacity":"500"}}
                        {"identifier":"Bookstore/GC","description":"3 - Bookstore/GC Parking Place","parking_site_id":"1"}
                        */

                        innerHTML = garageItem.title + '<br/><div style="border-top: 1px solid green; font-size: 90%; font-style: italic;">' + garageItem.msg + '</div>';

                        /*var occ = ((1 - props.occupancy_percentage) * 100).toFixed(1);
                        var nleft = props.capacity - props.occupancy;
                        innerHTML = 'Parking: ' + props.parking_area_id + ' - #' + item.GetKey() + '<br/>';
                        innerHTML += '<div style="font-size: 80%;">' +
                            garageName + props.lastupdate +
                            '<br/>' + nleft + ' empty, ' + props.occupancy + ' taken' +
                            '<br/>' + props.capacity + ' total, <b>' + occ + '% free</b>';*/
                        break;
                    case ITPACore.linesFeatureName:
                        /*
                        {"identifier":"GPE_PALMETTO_MMC_BBC","color":"#b78400","line_number":"1","platform_ids":[8,7,9],"line_id":"16"}}
                        */
                        innerHTML = 'Line #' + item.GetKey();
                        innerHTML += '<div style="font-size: 80%;">' +
                            props.identifier +
                            '<br/>Route: ' + props.line_number +
                            '<br/># of Stops: ' + props.platform_ids.length +
                            '<br/># of Buses: ' + item.nBuses +
                        '</div>';
                        break;
                    case ITPACore.searchFeatureName:
                        innerHTML = item.title + '<br/><div style="font-size: 90%;font-style: italic;">' + item.msg + '</div>';
                        if (item.link) {
                            innerHTML += "<div style='text-align:center;'>" + item.link + "<div/>";
                        }
                        break;
                    case ITPACore.directionsFeatureName:
                        innerHTML = item.title + '<br/><div style="font-size: 90%;font-style: italic;">' + item.msg + '</div>';
                        if (item.link) {
                            innerHTML += "<div style='text-align:center;'>" + item.link + "<div/>";
                        }
                        break;
                }
            }
        }
        return innerHTML;
    }

    function onUpdateToastedItem(firstUpdateBool) {
        if (!!toastedItem) {
            toastedContainer.GetHTMLElement().innerHTML = getHTMLFromItem(toastedItem);
            if (toastedMapFeature.GetIsPoint()) { mapHTMLOverlay.SetPointCoords(toastedMapFeature.GetPointCoords()); }
            else if (toastedPointCoords != undefined) { mapHTMLOverlay.SetPointCoords(toastedPointCoords); }
            else { mapHTMLOverlay.SetPointCoords(map.GetCenter()); }
            mapETAToaster.Toast(toastedItem);
            notify("update");
        }
    }

    function toastNext(mapFeature, container, xPos, yPos, offset, pointCoords) {
        var item = ITPACore.featureLayers.GetItemFromMapFeature(mapFeature);
        if (item) {
            toastedItem = item;
            toastedMapFeature = mapFeature;
            toastedContainer = container;
            toastedPointCoords = pointCoords;
            mapHTMLOverlay.SetContent(container);
            mapHTMLOverlay.SetPositioning(xPos, yPos);
            mapHTMLOverlay.SetOffset(offset);
            mapHTMLOverlay.SetVisible(true);
            onUpdateToastedItem(true);
            //toastShouldAutoClose = true;
            toastShouldAutoClose = false;
            onDelayCloseToast.DelayCallBack();
        }
    }

    function toastBus(mapFeature) { toastNext(mapFeature, busContainer, "center", "bottom", [0, -20]); }
    function toastMsg(mapFeature) { toastNext(mapFeature, msgContainer, "center", "top", [0, 8]); }
    function toastInc(mapFeature) { toastNext(mapFeature, incContainer, "center", "bottom", [0, -24]); }
    function toastOcc(mapFeature) { toastNext(mapFeature, occContainer, "center", "bottom", [0, -12]); }
    function toastLin(mapFeature, pointCoords) { toastNext(mapFeature, linContainer, "center", "bottom", [0, -2], pointCoords); }
    function toastStp(mapFeature) { toastNext(mapFeature, stpContainer, "center", "bottom", [0, -12]); }
    function toastSearch(mapFeature) { toastNext(mapFeature, searchContainer, "center", "top", [0, 8]); }
    function toastDirections(mapFeature) { toastNext(mapFeature, directionsContainer, "center", "top", [0, 16]); }
    function toastGar(mapFeature) {
        var item = ITPACore.featureLayers.GetItemFromMapFeature(mapFeature);
        if (!!item) {
            var occItem = ITPACore.featureLayers.GetKeyedItem(ITPACore.occFeatureName, item.GetKey());
            toastOcc(ITPACore.featureLayers.GetMapFeatureFromItem(occItem));
        }
    }
    function toastSSG(mapFeature, pointCoords) { toastNext(mapFeature, ssgContainer, "center", "bottom", [0, -20], pointCoords); }

    function onContainerClicked(notification) {
        switch (notification.eventName) {
            //case tf.consts.DOMEventNamesMouseClick:
            //case tf.consts.DOMEventNamesMouseDown:
            case tf.consts.DOMEventNamesTouchStart:
                //console.log('here');
                tf.events.StopDOMEvent(notification.event);
                if (toastShouldAutoClose) { toastShouldAutoClose = false; }
                else {
                    toastShouldAutoClose = true;
                    onDelayCloseToast.CallBackNow();
                }
                break;
        }
        return false;
    }

    function createContainerMouseListener(div) {
        new tf.events.DOMMouseListener({ target: div, callBack: onContainerClicked });
    }

    function createContainer(className, skipListener) {
        var div = new tf.dom.Div(/*{ cssClass: tfStyles.GetPaddedDivClassNames(false, false) }*/);
        if (className != undefined) { tf.dom.AddCSSClass(div, className); }
        tfStyles.ApplyStyleProperties(div, baseOverlayContainerStyles);
        if (!skipListener) {
            //createContainerMouseListener(div);
            var divElem = div.GetHTMLElement();
            divElem.addEventListener("click", function (event) {
                if (toastShouldAutoClose) { toastShouldAutoClose = false; }
                else {
                    toastShouldAutoClose = true;
                    onDelayCloseToast.CallBackNow();
                }
            }, true);
        }
        return div;
    }

    function createContainers() {
        busContainer = createContainer("busCardRow");
        busContainer.GetHTMLElement().style.backgroundColor = "rgba (200, 255, 255, 0.8)";
        msgContainer = createContainer("msgCardRow");
        incContainer = createContainer("incCardRow incCardStyle");
        occContainer = createContainer("garCardRow");
        ssgContainer = createContainer("ssgCardRow");
        stpContainer = createContainer("stopCardRow");
        linContainer = createContainer("lineCardRow");
        searchContainer = createContainer("searchCardRow searchCardStyle", false);
        directionsContainer = createContainer("directionsCardRow");
    }

    function initialize() {
        settings = tf.js.GetValidObjectFrom(settings);
        eventDispatcher = new tf.events.MultiEventNotifier({ eventNames: [allEventName] });
        if (tf.js.GetIsInstanceOf(settings.map, tf.map.Map)) {
            onDelayCloseToast = new tf.events.DelayedCallBack(3000, closeToast, theThis);
            tfStyles = tf.GetStyles();
            var tfSubStyles = tfStyles.GetSubStyles();
            var maxWidth = "240px";
            var maxHeight = undefined;
            var overflow = "auto";

            map = settings.map;

            baseOverlayContainerStyles = {
                inherits: [tfSubStyles.defaultShadowStyle, tfSubStyles.cursorDefaultStyle],
                fontFamily: "Arial", fontSize: "1.2em",
                padding: "3px",
                //backgroundColor: "transparent",
                maxWidth: maxWidth, maxHeight: maxHeight, overflow: overflow
            };

            ITPACore.CreateMapETAToaster(map);
            mapETAToaster = ITPACore.mapETAToaster;

            createContainers();

            toastFncs = {};
            toastFncs[ITPACore.busFeatureName] = toastBus;
            toastFncs[ITPACore.msgFeatureName] = toastMsg;
            toastFncs[ITPACore.incFeatureName] = toastInc;
            toastFncs[ITPACore.garFeatureName] = toastGar;
            toastFncs[ITPACore.occFeatureName] = toastOcc;
            //toastFncs[ITPACore.stopsFeatureName] = toastStp;
            toastFncs[ITPACore.linesFeatureName] = toastLin;
            toastFncs[ITPACore.searchFeatureName] = toastSearch;
            toastFncs[ITPACore.directionsFeatureName] = toastDirections;
            toastFncs[ITPACore.ssgFeatureName] = toastSSG;

            mapHTMLOverlay = new tf.map.HTMLOverlay({ map: map, autoPan: false, stopEvent: false });
            mapHTMLOverlay.GetOverlayHTMLElement().parentNode.style.zIndex = 1;
            map.AddListener(tf.consts.mapClickEvent, function (notification) {
                toastShouldAutoClose = true; onDelayCloseToast.CallBackNow();
            });
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

ITPACore.DivHorScrollerVerSizer = function (settings) {
    var theThis, htmlElem, mouseListener, notifyHScroll, notifyVSize, docMouseListener;
    var inDrag, maxHeight, minHeight, startScrollX, startHeight, startX, startY;

    this.GetHTMLElem = function () { return htmlElem; }
    this.GetIsInDrag = function () { return inDrag; }
    this.CancelDrag = function () { return cancelDrag(); }
    this.GetHeight = function () { return startHeight; }
    this.OnDelete = function () { if (!!mouseListener) { mouseListener.OnDelete(); mouseListener = undefined; } }

    function cancelDrag() {
        if (inDrag) {
            inDrag = false;
            if (!!docMouseListener) { docMouseListener.ReleaseCapture(); }
        }
    }

    function onMouseNotify(notification) {
        if (notification.target == htmlElem) {
            //tf.events.StopDOMEvent(notification.event);
            var x = notification.event.pageX, y = notification.event.pageY;
            if (notification.event.touches !== undefined && notification.event.touches.length > 0) {
                x = notification.event.touches[0].clientX; y = notification.event.touches[0].clientY;
            }
            switch (notification.eventName) {
                case tf.consts.DOMEventNamesMouseClick:
                    break;
                case tf.consts.DOMEventNamesMouseDown:
                case tf.consts.DOMEventNamesTouchStart:
                    startX = x;
                    startY = y;
                    startScrollX = htmlElem.scrollLeft;
                    inDrag = true;
                    if (!!docMouseListener) { docMouseListener.SetCapture(onMouseNotify); }
                    break;
                case tf.consts.DOMEventNamesTouchCancel:
                case tf.consts.DOMEventNamesTouchLeave:
                case tf.consts.DOMEventNamesTouchEnter:
                    //case tf.consts.DOMEventNamesMouseEnter:
                    //case tf.consts.DOMEventNamesMouseLeave:
                    //case tf.consts.DOMEventNamesMouseOver:
                    //case tf.consts.DOMEventNamesMouseOut:
                case tf.consts.DOMEventNamesMouseUp:
                case tf.consts.DOMEventNamesTouchEnd:
                    if (inDrag) {
                        //console.log(notification.eventName);
                        cancelDrag();
                    }
                    break;
                case tf.consts.DOMEventNamesMouseMove:
                case tf.consts.DOMEventNamesTouchMove:
                    if (inDrag) {
                        var diff = startX - x;
                        var newPos = startScrollX + diff;
                        if (newPos >= htmlElem.scrollWidth) { newPos = htmlElem.scrollWidth - 1; }
                        if (newPos < 0) { newPos = 0; }
                        if (htmlElem.scrollLeft != newPos) {
                            htmlElem.scrollLeft = newPos;
                            if (!!notifyHScroll) { notifyHScroll({ sender: theThis, verb: "hscroll", pos: newPos }); }
                        }
                        var diffY = startY - y;
                        if (Math.abs(diffY) > 20) {
                            var newHeight = startHeight + diffY;
                            if (newHeight < minHeight) { newHeight = minHeight; }
                            if (newHeight > maxHeight) { newHeight = maxHeight; }
                            if (newHeight != startHeight) {
                                startHeight = newHeight;
                                startY = y;
                                if (!!notifyVSize) {
                                    notifyVSize({ sender: theThis, verb: "vsize", height: startHeight });
                                }
                            }
                        }
                        break;
                    }
            }
        }
    }

    function initialize() {
        settings = tf.js.GetValidObjectFrom(settings);
        if (htmlElem = tf.dom.GetHTMLElementFrom(settings.container)) {
            //docMouseListener = tf.GetDocMouseListener();
            mouseListener = new tf.events.DOMMouseListener({
                target: htmlElem, callBack: onMouseNotify
            });
            inDrag = false;
            notifyHScroll = tf.js.GetFunctionOrNull(settings.onHScroll);
            notifyVSize = tf.js.GetFunctionOrNull(settings.onVSize);
            startHeight = settings.startHeight;
            maxHeight = settings.maxHeight;
            if ((minHeight = settings.minHeight) == undefined) {
                minHeight = 0;
            }
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
