//In angularJS 1.2, they made ng-transclude erase all content
//inside a directive before inserting transcluded content.
//We just act like 1.1.x transclude, appending transclusion.
jqmModule.directive('jqmTransclude', function() {
  return {
    controller: ['$transclude', function($transclude) {
      this.$transclude = $transclude;
    }],
    link: function(scope, elm, attr, controller) {
      controller.$transclude(function(clone) {
        elm.append(clone);
      });
    }
  };
});
