var JQM_ANIMATIONS = [
  'slide',
  'fade',
  'pop',
  'slidefade',
  'slidedown',
  'slideup',
  'flip',
  'turn',
  'flow'
];

for (var i=0; i<JQM_ANIMATIONS.length; i++) { registerJqmAnimation(JQM_ANIMATIONS[i]); }

function registerJqmAnimation(animationName) {
  jqmModule.animation('.' + animationName, ['$nextFrame', '$animationComplete', function($nextFrame, $animationComplete) {
    function makeAnimationFn(className) {
      return function(element, done) {
        var unbind;
        $nextFrame(function() {
          element.addClass(className);
          unbind = $animationComplete(element, done, true);
        });
        return function(cancelled) {
          if (cancelled) { unbind(); }
          element.removeClass(className);
        };
      };
    }
    var inAnimation = makeAnimationFn('in');
    var outAnimation = makeAnimationFn('out');
    return {
      enter: inAnimation,
      leave: outAnimation,
      move: inAnimation,
      show: inAnimation,
      hide: outAnimation,
      addClass: function(element, className, done) {
        if (className === 'out') {
          outAnimation(element, done) ;
        } else {
          inAnimation(element, done);
        }
      },
      removeClass: function(element, className, done) {
        if (className === 'out') {
          inAnimation(element, done);
        } else {
          outAnimation(element, done);
        }
      }
    };
  }]);
}
