"use strict";

ITPACore.HomeInit = function (settings) {
    var theThis, map, mapButtons, onHomeCB, onBBCCB, onOverviewCB, onStreetLevelCB, onLocationCB;
    var onHomeButton, onOverviewButton, onUserLocationButton, onStreetLevelButton;

    function createMapButtons() {
        var mapButtonStyles = { position: "absolute", right: "4px", top: "12px", pointerEvents: 'none' };
        var result = ITPACore.CreateMapControlButtonHolder(map, mapButtonStyles);
        var div = result.div;
        div.GetHTMLElement().parentNode.style.zIndex = 2;
        mapButtons = result.holder;

        if (onHomeCB) { onHomeButton = ITPACore.CreateMapButton("itpa-maphome-button", onHomeCB, div); }
        if (onBBCCB) { onHomeButton = ITPACore.CreateMapButton("itpa-mapbbc-button", onBBCCB, div); }
        if (onLocationCB) { onUserLocationButton = ITPACore.CreateMapButton("itpa-mapuserlocation-button", onLocationCB, div); }
        if (onOverviewCB) { onOverviewButton = ITPACore.CreateMapButton("itpa-mapoverview-button", onOverviewCB, div); }
        if (onStreetLevelCB) { onStreetLevelButton = ITPACore.CreateMapButton("itpa-mapstreetlevel-button", onStreetLevelCB, div); }
    }

    function initialize() {
        if (tf.js.GetIsValidObject(settings)) {
            map = settings.map;
            onHomeCB = tf.js.GetFunctionOrNull(settings.onHome);
            onBBCCB = tf.js.GetFunctionOrNull(settings.onBBC);
            onOverviewCB = tf.js.GetFunctionOrNull(settings.onOverview);
            onStreetLevelCB = tf.js.GetFunctionOrNull(settings.onStreetLevel);
            onLocationCB = tf.js.GetFunctionOrNull(settings.onLocation);
            createMapButtons();
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

