"use strict";

var g_notificationPopup;

function onVisitedWebSite() { if (g_notificationPopup) { g_notificationPopup.close(); } }

ITPACore.HomeNotification = function (settings) {
    var theThis, notificationItemName, $ionicPopup, pendingNotifications;

    this.ResetNotifications = function () { return delNotificationItem; }
    
    this.OnNotificationsReceived = function (data) { return onNotificationsReceived(data); };

    function getNotificationItem() {
        var item = ITPACore.GetLocalStorageItem(notificationItemName);
        if (!item) { item = {}; }
        return item;
    }

    function delNotificationItem() { return ITPACore.DelLocalStorageItem(notificationItemName); }

    function setNotificationItem(notificationItem) { return ITPACore.SetLocalStorageItem(notificationItemName, notificationItem); }

    function getNotificationKey(notificationId) {
        return (tf.js.GetIsInt(notificationId) && notificationId > 0) ? '#' + notificationId : undefined;
    }

    function recordNotificationRead(notificationId) {
        var notificationKey = getNotificationKey(notificationId);
        if (notificationKey != undefined) {
            var notificationItem = getNotificationItem();
            if (notificationItem[notificationKey] == undefined) {
                notificationItem[notificationKey] = notificationId;
                setNotificationItem(notificationItem);
            }
        }
    }

    function advanceToNext() { if (pendingNotifications.length > 0) { setTimeout(showPendingNotification, 250); } }

    function showPendingNotification() {
        if (pendingNotifications.length > 0) {
            var n = pendingNotifications[0];
            pendingNotifications.splice(0, 1);
            recordNotificationRead(n.notification_id);

            var summary = n.summary;

            var template;

            if (n.icon) {
                summary = "<img src='" + n.icon + "' style='float:left;padding:5px;max-width:35%;'/>" + summary;
            }

            if (n.url) {
                var link = ITPACore.CreateVisitWebSiteLink(n.url, "onVisitedWebSite();")
                summary = summary + link;
            }

            if ($ionicPopup) {
                var alertPopup = $ionicPopup.alert({
                    title: n.title,
                    template: summary,
                });

                g_notificationPopup = alertPopup;

                alertPopup.then(function (res) { advanceToNext(); });
            }
            else {
                advanceToNext();
            }
        }
    }

    function onNotificationsReceived(data) {
        if (!pendingNotifications.length) {
            pendingNotifications = [];
            //data = data ? data.data : undefined;
            if (tf.js.GetIsNonEmptyArray(data)) {
                var notificationItem = getNotificationItem();
                for (var i in data) {
                    var n = data[i];
                    var notificationKey = getNotificationKey(n.notification_id);
                    if (notificationKey != undefined && notificationItem[notificationKey] == undefined) { pendingNotifications.push(n); }
                }
            }
            if (pendingNotifications.length > 0) { showPendingNotification(); }
        }
    };

    function initialize() {
        pendingNotifications = [];
        notificationItemName = ITPACore.currentUser.email + "-notification2";
        if (tf.js.GetIsValidObject(settings)) {
            $ionicPopup = settings.$ionicPopup;
            if (!!settings.reset) { delNotificationItem(); }
        }
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};
