
jqmModule.directive('jqmPanelContentWrap', ['$compile', function($compile) {
    var panelDismissTpl = '<div class="ui-panel-dismiss" ' +
        'ng-click="$panel.left.opened = false; $panel.right.opened = false" ' +
        'ng-class="($panel.left.opened || $panel.right.opened) ? \'ui-panel-dismiss-open\' : \'\'" ' +
        '></div>';

    return {
        link: function(scope, element, attr) {
            var panelDismissEl = $compile(panelDismissTpl)(scope);

            scope.$watch(openPanelWatch, openPanelChanged);
            element.parent().append(panelDismissEl);

            function openPanelWatch() {
                if (!scope.$panel) { return; }
                scope.$panel.$contentWrapNode = element[0];

                return (scope.$panel.left && scope.$panel.left.opened && scope.$panel.left) ||
                    (scope.$panel.right && scope.$panel.right.opened && scope.$panel.right);
            }

            function openPanelChanged(openPanel, oldOpenPanel) {
                if (!scope.$panel) { return; }

                element.addClass('ui-panel-content-wrap ui-panel-animate');

                element.toggleClass('ui-panel-content-wrap-open', !!openPanel);

                element.toggleClass('ui-panel-content-wrap-position-left',
                    !!(scope.$panel.left && openPanel === scope.$panel.left));

                element.toggleClass('ui-panel-content-wrap-position-right',
                    !!(scope.$panel.right && openPanel === scope.$panel.right));

                element.toggleClass('ui-panel-content-wrap-display-reveal',
                    !!(openPanel && openPanel.display === 'reveal'));
                element.toggleClass('ui-panel-content-wrap-display-push',
                    !!(openPanel && openPanel.display === 'push'));
                element.toggleClass('ui-panel-content-wrap-display-overlay',
                    !!(openPanel && openPanel.display === 'overlay'));
            }
        }
    };
}]);
