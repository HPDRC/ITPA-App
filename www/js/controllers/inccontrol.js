"use strict";

ITPACore.IncControl = function (settings) {
    var theThis, map, itpaFeatureLayers, keyedList, isShowing, mapControl, filterButton, getFilterFnc, setFilterFnc;

    this.Show = function (showBool) { return show(showBool); }
    this.GetIsShowing = function () { return isShowing; }

    this.Update = function () { return update(); }

    function show(showBool) {
        if (isShowing != (showBool = !!showBool)) {
            isShowing = showBool;
            if (mapControl) {
                mapControl.SetVisible(isShowing);
                checkFilterButtonVisibility();
            }
        }
    }

    function checkFilterButtonVisibility() {
        if (!!filterButton) { filterButton.style.display = ITPACore.directionsRouteFeature != undefined ? "inline-block" : "none"; }
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

    function createMapControl() {
        var mapControlStyles = { position: "absolute", right: "8px", bottom: "8px", zIndex: 3000, pointerEvents: 'none' };
        var mapControlHolder = ITPACore.CreateMapControlButtonHolder(map, mapControlStyles);
        var divMapControl = mapControlHolder.div;

        filterButton = createButton("button button-balanced lineMapDetail button-less-height button-width-like-less-height", undefined, undefined, undefined, "inline-block",
            onFilterToggle);
        updateFilterButton();

        divMapControl.AddContent(filterButton)

        mapControl = mapControlHolder.holder;
        isShowing = true;
        show(false);
    }

    function initialize() {
        itpaFeatureLayers = ITPACore.featureLayers;
        if (tf.js.GetIsValidObject(settings)) {
            if (map = tf.js.GetMapFrom(settings.map)) {
                getFilterFnc = ITPACore.GetIsFilteringIncForDistance;
                setFilterFnc = ITPACore.SetIsFilteringIncForDistance;
                keyedList = itpaFeatureLayers.GetKeyedList(ITPACore.incFeatureName);
                createMapControl();
            }
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
