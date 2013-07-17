
/**
 * @ngdoc directive
 * @name jqm.directive:jqmPanel
 * @restrict A
 *
 * @description
 * Creates a jquery mobile panel.  Must be placed outside of a jqm-viewport.
 *
 * @param {expression=} opened Assignable angular expression to data-bind the panel's open state to.
 * @param {string=} display Default 'reveal'.  What display type the panel has. Available: 'reveal', 'overlay', 'push'.
 * @param {string=} position Default 'left'. What position the panel is in. Available: 'left', 'right'.
 *
 * </ul>
 * ### $panel Scope
 *
 * The jqm-panel directive will create a `$panel` object on the current scope. 
 *
 * If a `position="left"` jqm-panel is created, `scope.$panel.left` will be populated with that panel's data. If a `position="right"` jqm-panel is created, `scope.$panel.right` will be populated.  scope.$panel.left and scope.$panel.right are objects with the following properties:
 *
 *  - `{boolean}` `opened` - Data-bound value saying whether this panel is currently opened.
 *  - `{void}` `toggle()` - Flips the panel's `opened` state.
 *  - `{string}` `display` - The current display of the panel.
 *  - `{string}` `position` - The current position of the panel.
 *
 * @example
<example module="jqm">
  <file name="index.html">
    <div jqm-panel>
      Hello, left panel!
    </div>
    <div jqm-viewport>
      <div jqm-page>
        <div jqm-header>Panel Demo</div>
        <div jqm-content>
          Hello!
          <div jqm-flip ng-model="$panel.left.opened">
            Left panel opened?
          </div>
          <div jqm-flip ng-model="$panel.right.opened">
            Right panel opened?
          </div>
        </div>
      </div>
    </div>
    <div jqm-panel position="right" display="overlay">
      Right panel!
    </div>
  </file>
</example>
 */
jqmModule.directive('jqmPanel', ['$transitionComplete', '$window', function(transitionComplete, $window) {
    var isdef = angular.isDefined;
    return {
        restrict: 'A',
        require: '^?jqmViewport',
        replace: true,
        transclude: true,
        templateUrl: 'templates/jqmPanel.html',
        scope: {
            display: '@',
            position: '@',
            opened: '=?'
        },
        compile: function(element, attr) {
            attr.display = isdef(attr.display) ? attr.display : 'reveal';
            attr.position = isdef(attr.position) ? attr.position : 'left';

            return function(scope, element, attr, jqmPageCtrl) {
                var $panel = scope.$parent.$panel = scope.$parent.$panel || {};
                var container = element.parent();

                if (jqmPageCtrl) {
                    throw new Error("jqm-panel cannot be inside of jqm-viewport. Instead, place it as a sibling of a jqm-viewport, outside.");
                }
                if (scope.position !== 'left' && scope.position !== 'right') {
                    throw new Error("jqm-panel position is invalid. Expected 'left' or 'right', got '"+scope.position+"'");
                }

                $panel[scope.position] = scope;
                scope.toggle = toggle;
                scope.$watch('opened', watchOpened);

                function watchOpened(isOpen) {
                    if (isOpen) {
                        var other = otherPanel();
                        if (other && other.opened) {
                            other.opened = false;
                        }
                        element.removeClass('ui-panel-closed');
                        $window.setTimeout(function() {
                            element.addClass('ui-panel-open');
                            transitionEnd(onChangeDone);
                        }, 1);
                    } else {
                        element.removeClass('ui-panel-open ui-panel-opened');
                        transitionEnd(onChangeDone);
                    }
                }
                function onChangeDone() {
                    if (scope.opened) {
                        element.addClass('ui-panel-opened');
                    } else {
                        element.addClass('ui-panel-closed');
                    }
                }
                function otherPanel() {
                    return $panel[scope.position === 'left' ? 'right' : 'left'];
                }
                function transitionEnd(cb) {
                    //We need to listen for transition complete event on either the panel
                    //element OR the panel content wrapper element. Some panel display
                    //types (overlay) only animate the panel, and some (reveal) only 
                    //animate the content wrapper.
                    transitionComplete(angular.element([element[0], $panel.$contentWrapNode]), cb, true);
                }
                function toggle() {
                    scope.opened = !scope.opened;
                }
            };
        }
    };
}]);
