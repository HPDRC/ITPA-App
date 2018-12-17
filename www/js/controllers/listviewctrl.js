"use strict";

starter.controllers.controller('ListViewCtrl', ['$scope', function ($scope) {

    var listScrollLefts = [0, 0];

    var cardArrays = {};

    var cardArrayFeatureNames = [ITPACore.busFeatureName, ITPACore.incFeatureName, ITPACore.msgFeatureName,
        ITPACore.garFeatureName, ITPACore.linesFeatureName, ITPACore.searchFeatureName, ITPACore.directionsFeatureName];

    for (var i in cardArrayFeatureNames) { cardArrays[cardArrayFeatureNames[i]] = []; }

    var placeholderFeatureName = 'placeholder', placeholderItemKey = '1';

    var placeholderItem = {
        cardTitle: 'Retrieving information from server...',
        cardMsg: ' ',
        isVisible: true
    };

    var placeholderCard = {
        featureKey: placeholderFeatureName,
        featureName: placeholderFeatureName,
        item: placeholderItem,
        itemKey: placeholderItemKey
    };

    var placeholderCardArray = [placeholderCard];

    $scope.isPlaceholderCard = function (card) {
        return card.featureName == placeholderFeatureName;
    }
    $scope.isBusCard = function (card) { return card.featureName == ITPACore.busFeatureName; }
    $scope.isIncidentCard = function (card) { return card.featureName == ITPACore.incFeatureName; }
    $scope.isMessageCard = function (card) { return card.featureName == ITPACore.msgFeatureName; }
    $scope.isGarageCard = function (card) { return card.featureName == ITPACore.garFeatureName; }
    $scope.isStopCard = function (card) { return card.featureName == ITPACore.stopsFeatureName; }
    $scope.isLineCard = function (card) { return card.featureName == ITPACore.linesFeatureName; }
    $scope.isSearchCard = function (card) { return card.featureName == ITPACore.searchFeatureName; }
    $scope.isDirectionsCard = function (card) {
        return card.featureName == ITPACore.directionsFeatureName && !card.item.isBusDirection;
    };
    $scope.isBusDirectionsCard = function (card) {
        return card.featureName == ITPACore.directionsFeatureName && card.item.isBusDirection;
    };

    $scope.cardArrayUse = placeholderCardArray;
    //$scope.cardArrayUse = [];

    function createCardForItem(item) {
        var featureName = item.featureName;
        
        if (cardArrays[featureName]) {
            var itemKey = item.GetKey();
            return {
                featureKey: featureName + '|' + itemKey,
                featureName: featureName,
                //title: featureName + ' #' + itemKey,
                item: item,
                itemKey: itemKey/*,
                itemOrder: itemKey*/
            };
        }
        return undefined;
    }

    function addCards(items) {
        var cardArray = getCardArrayForItems(items);
        if (cardArray) {
            var cardsToAdd = [];
            for (var i in items) {
                var item = items[i], card = createCardForItem(items[i]);
                if (!!card) { cardsToAdd.push(card); }
            }
            if (cardsToAdd.length) { cardArray.push.apply(cardArray, cardsToAdd); }
        }
    }

    function filterItems(fromCardArray, items) {
        return fromCardArray.filter(function (card) {
            for (var i in items) { if (items[i] == card.item) { return false; } }
            return true;
        });
    }

    function getCardArrayForItem(item) { return !!item ? cardArrays[item.featureName] : undefined; }

    function getCardArrayForItems(items) { for (var i in items) { return getCardArrayForItem(items[i]); } return undefined; }

    function delCards(items) {
        var cardArray = getCardArrayForItems(items);
        if (cardArray) { cardArray = filterItems(cardArray, items); }
    }

    function getCardHTMLElement(card) { return document.getElementById(card.featureKey); }
    function getAllListHTMLElement() { return document.getElementById("itpaList"); }

    function getAllCardsListHTMLElement() { return document.getElementById("itpaAllListContent"); }

    function getListHTMLElement(item) { return getAllListHTMLElement(); }

    function scrollToItemOnCardArray(item, cardArray) {
        var found;
        for (var i in cardArray) {
            var card = cardArray[i];
            if (card.item == item) {
                //console.log('trying to scroll to item ' + card.itemKey);
                var cardElem = getCardHTMLElement(card);
                if (!!cardElem) {
                    var listElem = getListHTMLElement(item);
                    if (!!listElem) {
                        //console.log('scrolling to item ' + card.itemKey);
                        var off = cardElem.offsetLeft;
                        //if (off > itpaList.scrollLeft && off > 40) { off -= 20; }
                        listElem.scrollLeft = off;
                    }
                }
                found = true;
                break;
            }
        }
        if (!found) {
            console.log('failed to scroll to item ' + item.GetKey());
        }
    }

    function scrollToItem(item) {
        var cardArray = getCardArrayForItem(item);
        if (cardArray) { scrollToItemOnCardArray(item, cardArray); }
    }

    function showCards(featureName) {
        $scope.cardArrayUse = cardArrays[featureName] != undefined ? cardArrays[featureName] : [];
    }

    $scope.filterAllList = function(value, index, array) {
        return value.item.isVisible || value.item.featureName == ITPACore.linesFeatureName;
    }

    $scope.orderList = function (cardItem) {
        /*if (cardItem.item.featureName == ITPACore.busFeatureName) {
            var item = cardItem.item;
            return item.order;
        }
        return undefined;*/
        return cardItem.item.order;
    }

    function setPlaceHolder(title, msg) {
        placeholderItem.cardTitle = title;
        placeholderItem.cardMsg = msg;
    }

    $scope.onRegisterList({ addCards: addCards, delCards: delCards, scrollToItem: scrollToItem, showCards: showCards, setPlaceHolder: setPlaceHolder });
}]);
