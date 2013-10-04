/**
 * @ngdoc directive
 * @name jqm.directive:jqmPage
 * @restrict A
 *
 * @description
 * Creates a jquery mobile page. Also adds automatic overflow scrolling for it's content.
 *
 * @example
 <example module="jqm">
 <file name="index.html">
 <div jqm-page class="jqm-standalone-page" style="height: 100px;">
 <p>Hello world!</p>
 <p>New Line</p>
 <p>New Line</p>
 <p>New Line</p>
 <p>New Line</p>
 <p>New Line</p>
 <p>New Line</p>
 <p>New Line</p>
 <p>New Line</p>
 <p>New Line</p>
 <p>New Line</p>
 </div>
 </file>
 </example>
 */
jqmModule.directive('jqmPage', ['$rootScope', '$controller', '$scroller', function ($rootScope, $controller, $scroller) {
  return {
    restrict: 'A',
    templateUrl: 'templates/jqmPage.html',
    replace: true,
    transclude: true,
    controller: ['$element', JqmPageController],
    link: function(scope, element) {
      var content = element.children();
      //Move headers out of ui-content
      angular.forEach(content.children(), function(node) {
        var el = angular.element(node);
        if (el.data('$jqmHeaderController') || el.data('$jqmFooterController')) {
          element.append(node);
        }
      });
    }
  };

  function JqmPageController(element) {
    var scroller = $scroller(element.children());

    this.scroll = function(newPos, easeTime) {
      if (arguments.length) {
        if (arguments.length === 2) {
          scroller.transformer.easeTo({x:0,y:newPos}, easeTime);
        } else {
          scroller.transformer.setTo({x:0,y:newPos});
        }
      }
      return scroller.transformer.pos;
    };
    this.scrollHeight = function() {
      scroller.calculateHeight();
      return scroller.scrollHeight;
    };
    this.outOfBounds = function(pos) {
      return scroller.outOfBounds(pos);
    };
  }
}]);
