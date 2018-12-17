"use strict";

ITPACore.MsgControl = function (settings) {
    var theThis, map, itpaFeatureLayers, keyedList, isShowing, mapControl, filterButton, getFilterFnc, setFilterFnc,
        dismissButton, $ionicPopup, showingDismiss, showingAll, onDismissCB;

    this.Show = function (showBool) { return show(showBool); }
    this.GetIsShowing = function () { return isShowing; }

    this.Update = function () { return update(); }

    function show(showBool) {
        if (isShowing != (showBool = !!showBool)) {
            isShowing = showBool;
            if (mapControl) {
                mapControl.SetVisible(isShowing);
                checkFilterButtonVisibility();
                checkDismissButtonVisibility();
            }
        }
    }

    function checkDismissButtonVisibility() {
        if (!!dismissButton) {
            var toastedItem = ITPACore.mapFeatureToaster.GetToastedItem();
            showingDismiss = !!toastedItem && toastedItem.featureName == ITPACore.msgFeatureName;
            dismissButton.style.display = !!showingDismiss ? "inline-block" : "none";
        }
    }

    function checkFilterButtonVisibility() {
        if (!!filterButton) {
            showingAll = ITPACore.directionsRouteFeature != undefined;
            filterButton.style.display = showingAll ? "inline-block" : "none";
        }
    }

    function update() {
        ITPACore.UpdateKeyedItemsForDistanceToRouteFeature(keyedList, !getFilterFnc());
        checkFilterButtonVisibility();
    }

    function createButton(className, color, backgroundColor, fontWeight, display, eventListener) {
        var button = document.createElement('button');
        button.className = className;
        if (color != undefined) { button.style.color = color; }
        if (backgroundColor != undefined) { button.style.backgroundColor = backgroundColor; }
        button.style.pointerEvents = "all";
        if (fontWeight != undefined) { button.style.fontWeight = fontWeight; }
        button.style.display = display;
        button.addEventListener('click', eventListener);
        return button;
    }

    function updateFilterButton() { if (!!filterButton) { filterButton.innerHTML = getFilterFnc() ? "All" : "Near"; } }

    function onFilterToggle() { setFilterFnc(!getFilterFnc()); updateFilterButton(); update(); }

    function onDismiss() {
        if (!!onDismissCB) {
            var toastedItem = ITPACore.mapFeatureToaster.GetToastedItem();
            if (!!toastedItem && toastedItem.featureName == ITPACore.msgFeatureName) {
                var data = toastedItem.GetData(), p = data.properties, m = p.message;
                //ITPACore.AddDismissMessage(m);
                onDismissCB(m);
            }
        }
    }

    function createMapControl() {
        var mapControlStyles = { position: "absolute", right: "0px", bottom: "8px", zIndex: 3000, pointerEvents: 'none' };
        var mapControlHolder = ITPACore.CreateMapControlButtonHolder(map, mapControlStyles);
        var divMapControl = mapControlHolder.div;

        divMapControl.GetHTMLElement().style.textAlign = "right";

        dismissButton = createButton("button button-energized lineMapDetail button-less-height button-width-like-less-height", undefined, undefined, undefined, "inline-block",
            onDismiss);
        dismissButton.innerHTML = "Dismiss";
        dismissButton.style.marginRight = "8px";

        filterButton = createButton("button button-balanced lineMapDetail button-less-height button-width-like-less-height", undefined, undefined, undefined, "inline-block",
            onFilterToggle);
        filterButton.style.marginRight = "8px";
        updateFilterButton();

        divMapControl.AddContent(filterButton, dismissButton)

        mapControl = mapControlHolder.holder;
        isShowing = true;
        show(false);
    }

    function initialize() {
        itpaFeatureLayers = ITPACore.featureLayers;
        if (tf.js.GetIsValidObject(settings)) {
            if (map = tf.js.GetMapFrom(settings.map)) {
                getFilterFnc = ITPACore.GetIsFilteringMsgForDistance;
                setFilterFnc = ITPACore.SetIsFilteringMsgForDistance;
                keyedList = itpaFeatureLayers.GetKeyedList(ITPACore.msgFeatureName);
                $ionicPopup = settings.$ionicPopup;
                ITPACore.mapFeatureToaster.AddListener(function () { checkDismissButtonVisibility() });
                createMapControl();
                onDismissCB = tf.js.GetFunctionOrNull(settings.onDismiss);
                showingDismiss = showingAll = false;
            }
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
