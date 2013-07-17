
jqmModule.factory('$transitionComplete', ['$sniffer', function ($sniffer) {
    return function (el, callback, once) {
        var eventNames = 'transitionend';
        if (!$sniffer.animations) {
            throw new Error("Browser does not support css transitions.");
        }
        if ($sniffer.vendorPrefix) {
            eventNames += " " + $sniffer.vendorPrefix.toLowerCase() + "TransitionEnd";
        }
        //We have to split because unbind doesn't support multiple event names in one string
        //This will be fixed in 1.2, PR opened https://github.com/angular/angular.js/pull/3256
        angular.forEach(eventNames.split(' '), function(eventName) {
            function onceDone() {
                callback();
                el.unbind(eventName, onceDone);
            }
            el.bind(eventName, once ? onceDone : callback);
        });
    };
}]);
