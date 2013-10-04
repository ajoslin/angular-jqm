/**
 * @ngdoc directive
 * @name jqm.directive:jqmPanelContainer
 * @restrict A
 *
 * @description
 * A container for jquery mobile panels.
 *
 * If you wish to use this with a view, you want the jqm-panel-container as the
 * parent of your view and your panels. For example:
 * <pre>
 * <div jqm-panel-container="myPanel">
 *   <div jqm-panel>My Panel!</div>
 *   <div jqm-view></div>
 * </div>
 * </pre>
 *
 * @param {expression=} jqmPanelContainer Assignable angular expression to data-bind the panel's open state to.
 *            This is either `left` (show left panel), `right` (show right panel) or null.
 *
 * @example
<example module="jqm">
  <file name="index.html">
   <div ng-init="state={}"></div>
   <div jqm-panel-container="state.openPanel" style="height:300px;overflow:hidden">
    <div jqm-panel position="left">
      Hello, left panel!
    </div>
    <div jqm-panel position="right" display="overlay">
     Hello, right panel!
    </div>
    <div style="background: white">
       Opened panel: {{state.openPanel}}
       <button ng-click="state.openPanel='left'">Open left</button>
       <button ng-click="state.openPanel='right'">Open right</button>
    </div>
   </div>
  </file>
</example>
 */

jqmModule.directive('jqmPanelContainer', ['$timeout', '$transitionComplete', '$sniffer', function ($timeout, $transitionComplete, $sniffer) {
  return {
    restrict: 'A',
    transclude: true,
    replace: true,
    templateUrl: 'templates/jqmPanelContainer.html',
    scope: {
      openPanelName: '=jqmPanelContainer'
    },
    controller: ['$scope', '$element', JqmPanelContainerCtrl]
  };
  function JqmPanelContainerCtrl($scope, $element) {
    var panels = {},
      content;

    this.addPanel = function (panel) {
      panels[panel.scope.position] = panel;
    };

    $scope.$watch('$scopeAs.pc.openPanelName', openPanelChanged);
    if (!$sniffer.animations) {
      $scope.$watch('$scopeAs.pc.openPanelName', transitionComplete);
    } else {
      $transitionComplete($element, transitionComplete);
    }

    function openPanelChanged() {
      updatePanelContent();
      angular.forEach(panels, function (panel) {
        var opened = panel.scope.position === $scope.openPanelName;
        if (opened) {
          panel.element.removeClass('ui-panel-closed');
          $timeout(function () {
            $element.addClass('jqm-panel-container-open');
            panel.element.addClass('ui-panel-open');
          }, 1, false);
        } else {
          panel.element.removeClass('ui-panel-open ui-panel-opened');
          $element.removeClass('jqm-panel-container-open');
        }
      });

    }

    //Doing transition stuff in jqmPanelContainer, as
    //we need to listen for transition complete event on either the panel
    //element or the panel content wrapper element. Some panel display
    //types (overlay) only animate the panel, and some (reveal) only
    //animate the content wrapper.
    function transitionComplete() {
      angular.forEach(panels, function (panel) {
        var opened = panel.scope.position === $scope.openPanelName;
        if (opened) {
          panel.element.addClass('ui-panel-opened');
        } else {
          panel.element.addClass('ui-panel-closed');
        }
      });
    }

    function updatePanelContent() {
      if (!content) {
        content = findPanelContent();
      }
      var openPanel = panels[$scope.openPanelName],
        openPanelScope = openPanel && openPanel.scope;

      content.addClass('ui-panel-content-wrap ui-panel-animate');

      content.toggleClass('ui-panel-content-wrap-open', !!openPanelScope);

      content.toggleClass('ui-panel-content-wrap-position-left',
        !!(openPanelScope && openPanelScope.position === 'left'));

      content.toggleClass('ui-panel-content-wrap-position-right',
        !!(openPanelScope && openPanelScope.position === 'right'));
      content.toggleClass('ui-panel-content-wrap-display-reveal',
        !!(openPanelScope && openPanelScope.display === 'reveal'));
      content.toggleClass('ui-panel-content-wrap-display-push',
        !!(openPanelScope && openPanelScope.display === 'push'));
      content.toggleClass('ui-panel-content-wrap-display-overlay',
        !!(openPanelScope && openPanelScope.display === 'overlay'));
    }

    function findPanelContent() {
      var content = angular.element();
      angular.forEach($element.children(), function(node) {
        var el = angular.element(node);
        // ignore panels and the generated ui-panel-dismiss div.
        if (!el.data('$jqmPanelController') && !el.hasClass('ui-panel-dismiss')) {
          content.push(node);
        }
      });
      return content;
    }
  }
}]);
