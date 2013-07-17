jqmModule.directive('jqmViewport', ['jqmCachingViewDirective', '$animator', '$history', 'jqmPanelContentWrapDirective', function (ngViewDirectives, $animator, $history, jqmPanelContentWrapDirectives) {
    // Note: Can't use template + replace here,
    // as this might be used on the <body>, which is not supported by angular.
    // So we are calling the ngViewDirective#link functions directly...
    return {
        restrict: 'A',
        compile: function (cElement) {
            cElement.addClass("ui-mobile-viewport");
            return link;
        },
        // for ng-view
        terminal: true
    };
    function link(scope, iElement, iAttrs, ctrl) {
        /*jshint -W040:true*/
        var self = this,
            args = arguments;
        angular.forEach(ngViewDirectives, function (directive) {
            directive.link.apply(self, args);
        });
        scope.$on('$viewContentLoaded', function (event, page) {
            // Note: event.targetScope does not work when we put a jqm-theme on the page.
            var pageScope = page.scope();
            // if animations are disabled,
            // add the "ui-page-active" css class manually.
            // E.g. needed for the initial page.
            if (!$animator.enabled()) {
                iElement.children().addClass("ui-page-active");
            }
            iElement.addClass("ui-overlay-" + pageScope.$theme);
        });
        scope.$on('$routeChangeStart', function (scope, newRoute) {
            // Use $routeChangeStart and not $watch:
            // Need to update the animate function before
            // ngView evaluates it!
            var transition,
                reverse = $history.activeIndex < $history.previousIndex;
            if (reverse) {
                transition = $history.urlStack[$history.previousIndex].transition;
            } else {
                transition = newRoute.transition;
                if (angular.isFunction(transition)) {
                    transition = transition(newRoute.params);
                }
                $history.urlStack[$history.activeIndex].transition = transition;
            }
            transition = transition || 'none';
            iAttrs.$set('ngAnimate', "'jqmPage-" + transition + (reverse?"-reverse":"")+"'");
        });

        angular.forEach(jqmPanelContentWrapDirectives, function(delegate) {
            delegate.link(scope, iElement, iAttrs);
        });
    }
}]);
