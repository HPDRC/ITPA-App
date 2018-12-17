"use strict";

ITPACore.LineBusMapControl = function (settings) {
    var theThis, map, divBusNameElem, toaster, etaToaster, mapControl, itpaFeatureLayers;
    var stopNameAndPrevNextButtonsDiv, allLinesAndLinesNameButtonsDiv;
    var lineNameButton, lineDirectionButton, allLinesButton, busNameButton, stopNameButton, nextStopButton, prevStopButton;
    var busNameSpan, stopNameSpan;
    var onLineNameClickedCB, onLineDirectionClickedCB, onShowAllLinesCLickedCB, getShowAllLinesCB, onBusNameClickedCB, onStopNameClickedCB, onNextPrevStopClickedCB;

    this.Show = function (showBool) { return show(showBool); }
    this.Update = function () { return update(); }

    function show(showBool) { if (mapControl) { mapControl.SetVisible(showBool); } }

    function onToastEvent() { updateBusNameButton(); updateStopNameButton(); }
    function onETAToastEvent(notification) { updateStopNameButton(); }

    function update() {
        updateLineNameButton();
        updateLineDirectionButton();
        updateAllLinesButtonText();
        updateBusNameButton();
        updateStopNameButton();
    }

    function updateLineNameButton() {
        if (!!lineNameButton) {
            var currentLine = itpaFeatureLayers.GetCurrentLineItem();
            if (!!currentLine) {
                var props = !!currentLine ? currentLine.GetData().properties : undefined;
                var currentLineName = !!props ? props.identifier : "undefined";
                var bkColor = !!props ? props.color : undefined;
                lineNameButton.innerHTML = currentLineName;
                if (bkColor != undefined) {
                    lineNameButton.style.backgroundColor = bkColor;
                }
            }
            lineNameButton.style.display = !!currentLine ? 'inline-block' : 'none';
        }
    }

    function updateLineDirectionButton() {
        if (!!lineDirectionButton) {
            var currentLine = itpaFeatureLayers.GetCurrentLineItem();
            if (!!currentLine) {
                var innerHTML = !!currentLine ? currentLine.cardMsg + ' - ' + currentLine.nBuses + ' <i class="itpa-bus-text iconInCardText"></i>' : '';
                lineDirectionButton.innerHTML = innerHTML;
            }
            lineDirectionButton.style.display = !!currentLine ? 'inline-block' : 'none';
        }
    }

    function updateAllLinesButtonText() {
        if (!!allLinesButton) {
            var currentLine = itpaFeatureLayers.GetCurrentLineItem();
            var text = getShowAllLinesCB() ? "this" : "all";
            allLinesButton.innerHTML = text;
            allLinesButton.style.display = !!currentLine ? 'inline-block' : 'none';
        }
    }

    function updateBusNameButton() {
        var selBus;
        if (!!busNameButton) {
            var toastedItem = toaster.GetToastedItem();
            if (!!toastedItem && toastedItem.featureName == ITPACore.busFeatureName) {
                selBus = toastedItem;
                //console.log(selBus.GetData().properties.heading);
            }
            if (!!selBus) {
                var text = getShowAllLinesCB() ? "this" : "all";
                busNameSpan.innerHTML = selBus.cardTitle;
            }
            busNameButton.style.display = !!selBus ? 'inline-block' : 'none';
        }
    }

    function updateStopNameButton() {
        if (!!stopNameAndPrevNextButtonsDiv) {
            var eta = etaToaster.GetLastETAClicked();
            var stopItem;
            if (!!eta) { stopItem = eta.stopItem; }
            if (!!stopItem) {
                var stopName = stopItem.cardTitle;
                stopName = stopName.toLowerCase().replace(/([^a-z]|^)([a-z])(?=[a-z]{2})/g, function (_, g1, g2) { return g1 + g2.toUpperCase(); });
                stopNameSpan.innerHTML = stopName;
                stopNameButton.style.display = 'inline-block';
            }
            stopNameAndPrevNextButtonsDiv.GetHTMLElement().style.display = !!stopItem ? "block" : "none";
        }
    }

    function getHandlerRetVal(event) { return false; }

    function onAllLinesButtonClicked(event) {
        if (onShowAllLinesCLickedCB) { onShowAllLinesCLickedCB(); }
        updateAllLinesButtonText();
        return getHandlerRetVal(event);
    }

    function onPrevStopClicked(event) { if (onNextPrevStopClickedCB) { onNextPrevStopClickedCB({ isNext: false }); } return getHandlerRetVal(event); }
    function onNextStopClicked(event) { if (onNextPrevStopClickedCB) { onNextPrevStopClickedCB({ isNext: true }); } return getHandlerRetVal(event); }
    function onBusNameButtonClicked(event) { if (onBusNameClickedCB) { onBusNameClickedCB(); } return getHandlerRetVal(event); }
    function onStopNameButtonClicked(event) { if (onStopNameClickedCB) { onStopNameClickedCB(); } return getHandlerRetVal(event); }
    function onLineNameButtonClicked(event) { if (onLineNameClickedCB) { onLineNameClickedCB(); } return getHandlerRetVal(event); }
    function onLineDirectionButtonClicked(event) { if (onLineDirectionClickedCB) { onLineDirectionClickedCB(); } return getHandlerRetVal(event); }

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

    function createIcon(className) { var icon = document.createElement('icon'); icon.className = className; return icon; }

    function createMapControl() {
        var marginVer = '8px';
        var marginHor = '5px';
        var mapButtonStyles = { position: "absolute", right: "8px", bottom: "8px", zIndex: 3000, pointerEvents: 'none' };
        var result = ITPACore.CreateMapControlButtonHolder(map, mapButtonStyles);
        var div = result.div;
        var currentLine = itpaFeatureLayers.GetCurrentLineItem();
        var currentLineName = !!currentLine ? currentLine.GetData().properties.identifier : "undefined";
        var styles = tf.GetStyles();

        div.GetHTMLElement().style.textAlign = 'right';

        mapControl = result.holder;

        lineDirectionButton = createButton("button button-energized lineMapMsgStyle button-less-height", "navy", undefined, "bold", 'inline-block', onLineDirectionButtonClicked);

        lineNameButton = createButton("button button-balanced lineMapDetail button-less-height", undefined, undefined, undefined, 'inline-block', onLineNameButtonClicked);
        lineNameButton.style.fontSize = "12px";

        allLinesButton = createButton("button button-balanced lineMapDetail button-less-height button-width-like-less-height", undefined, undefined, undefined, "inline-block", onAllLinesButtonClicked);
        allLinesButton.style.marginRight = marginHor;

        busNameButton = createButton("button button-clear lineMapMsgStyle button-less-height", "#00b", "#aff", "bold", "inline-block", onBusNameButtonClicked);
        busNameButton.style.marginLeft = marginHor;
        busNameButton.appendChild(createIcon("itpa-bus-text iconInCardText"));
        busNameButton.appendChild(busNameSpan = document.createElement('span'));
        busNameButton.appendChild(createIcon("itpa-stop-text iconInCardText"));

        prevStopButton = createButton("button button-clear lineMapMsgStyle button-less-height button-width-like-less-height", "#00b", ITPACore.stopBkColor, "bold", "inline-block", onPrevStopClicked);
        prevStopButton.style.marginRight = marginHor;
        prevStopButton.appendChild(createIcon("itpa-backward-arrow-icon iconInCardText"));

        nextStopButton = createButton("button button-clear lineMapMsgStyle button-less-height button-width-like-less-height", "#00b", ITPACore.stopBkColor, "bold", "inline-block", onNextStopClicked);
        nextStopButton.appendChild(createIcon("itpa-forward-arrow-icon iconInCardText"));

        stopNameButton = createButton("button button-clear lineMapMsgStyle button-less-height", "#00b", ITPACore.stopBkColor, "bold", "inline-block", onStopNameButtonClicked);
        stopNameButton.style.marginRight = marginHor;
        stopNameButton.appendChild(createIcon("itpa-stop-text iconInCardText"));
        stopNameButton.appendChild(stopNameSpan = document.createElement('div'));
        stopNameSpan.style.display = "inline-block";
        stopNameSpan.style.verticalAlign = "bottom";
        stopNameSpan.style.overflow = "hidden";
        stopNameSpan.style.textOverflow = "ellipsis";
        stopNameSpan.style.whiteSpace = "nowrap";
        stopNameSpan.style.maxWidth = "14rem";

        var unpaddedBlockDivParam = {cssClass: styles.GetUnPaddedDivClassNames(false, false)};

        stopNameAndPrevNextButtonsDiv = new tf.dom.Div(unpaddedBlockDivParam);
        var busNameAndLineDirectionButtonsDiv = new tf.dom.Div(unpaddedBlockDivParam);
        allLinesAndLinesNameButtonsDiv = new tf.dom.Div(unpaddedBlockDivParam);

        stopNameAndPrevNextButtonsDiv.AddContent(stopNameButton, prevStopButton, nextStopButton);
        busNameAndLineDirectionButtonsDiv.AddContent(lineDirectionButton, busNameButton);
        allLinesAndLinesNameButtonsDiv.AddContent(allLinesButton, lineNameButton);

        busNameAndLineDirectionButtonsDiv.GetHTMLElement().style.marginBottom =
            stopNameAndPrevNextButtonsDiv.GetHTMLElement().style.marginBottom = marginVer;

        div.AddContent(stopNameAndPrevNextButtonsDiv, busNameAndLineDirectionButtonsDiv, allLinesAndLinesNameButtonsDiv);

        update();
        show(false);
    }

    function dummyReturnTrue() { return true; }

    function initialize() {
        itpaFeatureLayers = ITPACore.featureLayers;
        if (tf.js.GetIsValidObject(settings)) {
            if (map = tf.js.GetMapFrom(settings.map)) {
                toaster = ITPACore.mapFeatureToaster;
                toaster.AddListener(onToastEvent);
                etaToaster = ITPACore.mapETAToaster;
                etaToaster.AddListener(onETAToastEvent);
                onLineNameClickedCB = tf.js.GetFunctionOrNull(settings.onLineNameClicked);
                onLineDirectionClickedCB = tf.js.GetFunctionOrNull(settings.onLineDirectionClicked);
                onShowAllLinesCLickedCB = tf.js.GetFunctionOrNull(settings.onShowAllLinesCLicked);
                onBusNameClickedCB = tf.js.GetFunctionOrNull(settings.onBusNameClicked);
                onStopNameClickedCB = tf.js.GetFunctionOrNull(settings.onStopNameClicked);
                onNextPrevStopClickedCB = tf.js.GetFunctionOrNull(settings.onNextPrevStopClicked);
                if (!(getShowAllLinesCB = tf.js.GetFunctionOrNull(settings.getShowAllLines))) { getShowAllLinesCB = dummyReturnTrue; }
                createMapControl();
            }
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
