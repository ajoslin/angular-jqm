var VIEW_ANIMATION_DEFS = {
  fade: {
    sequential: true,
    fallback: 'fade'
  },
  pop: {
    sequential: true,
    fallback: 'fade'
  },
  slidefade: {
    sequential: true,
    fallback: 'fade'
  },
  slidedown: {
    sequential: true,
    fallback: 'fade'
  },
  slideup: {
    sequential: true,
    fallback: 'fade'
  },
  flip: {
    sequential: true,
    fallback: 'fade'
  },
  turn: {
    sequential: true,
    fallback: 'fade'
  },
  flow: {
    sequential: true,
    fallback: 'fade'
  }
};

jqmModule.directive('jqmView',
['$compile', '$templateCache', '$http', '$q', '$route', '$controller', '$injector', '$nextFrame', '$sniffer', '$animationComplete', '$parse',
function($compile, $templateCache, $http, $q, $route, $controller, $injector, $nextFrame, $sniffer, $animationComplete, $parse) {
  return {
    restrict: 'A',
    controller: ['$scope', JqmViewCtrl],
    templateUrl: 'templates/jqmView.html',
    replace: true,
    transclude: true,
    scope: true,
    link: link
  };

  function link(scope, element, attr, jqmViewCtrl) {
    var lastViewInstance,
      onloadExp = attr.onload || '',
      viewAttrGetter,
      currentAnimation,
      changeCounter = 0;

    if (attr[jqmViewCtrl.viewWatchAttr]) {
      viewAttrGetter = $parse(attr[jqmViewCtrl.viewWatchAttr]);
      watchRouteAttr(viewAttrGetter);
    } else {
      watchRoute();
    }

    $animationComplete(element, onViewAnimationComplete);

    //For some reason, a scope.$watch(attr[watchAttr], onChange, true) doesn't work - it always gives infinite digest error.
    //And we do need to check value, so people can do '<div jqm-view="{templateUrl: 'myTemplate.html', controller: 'MyCtrl'}"> etc
    var oldRoute;
    function watchRouteAttr(getter) {
      scope.$watch(function() {
        var newRoute = getter(scope);
        if (newRoute && !angular.equals(oldRoute, newRoute)) {
          viewChanged(newRoute);
          oldRoute = newRoute;
        }
      });
    }

    function watchRoute() {
      scope.$on('$routeChangeSuccess', update);
      update();
      function update() {
        viewChanged($route.current);
      }
    }

    function viewChanged(route) {
      if (!route) {
        return;
      }
      var thisChangeId = ++changeCounter;

      var template = route.locals ? route.locals.$template : route.template;
      var templateUrl = angular.isString(route) ? route : (route.loadedTemplateUrl || route.templateUrl);
      if (template || templateUrl) {
        jqmViewCtrl.loadView(templateUrl, template).then(function(viewInstance) {
          if (thisChangeId !== changeCounter) {
            return;
          }
          templateLoaded(route, viewInstance);
        });
      }
    }

    function templateLoaded(route, viewInstance) {
      var locals = route.locals || {};
      var controller;

      if (currentAnimation) {
        currentAnimation.finish();
      }

      var animationData = figureOutAnimation(route, viewInstance);
      if (!animationData.animationName || animationData.animationName === 'none') {
        changeView(viewInstance, lastViewInstance);
        currentAnimation = null;
      } else {
        currentAnimation = startViewAnimation(
          animationData,
          viewInstance,
          lastViewInstance || {}
        );
      }
      viewInstance.scope.$reconnect();

      locals.$scope = viewInstance.scope;
      if (route.controller) {
        controller = $controller(route.controller, locals);
        if (route.controllerAs) {
          viewInstance.scope[route.controllerAs] = controller;
        }
        viewInstance.element.data('$ngControllerController', controller);
      }

      viewInstance.scope.$emit('$viewContentLoaded', viewInstance.element);
      viewInstance.scope.$eval(onloadExp);
      //no $anchorScroll because we don't use browser scrolling anymore

      scope.$viewTheme = viewInstance.scope.$theme;
      lastViewInstance = viewInstance;
    }

    function onViewAnimationComplete(e) {
      console.log(e);
    }

    function figureOutAnimation(route, viewInstance) {
      var animation,
        reverse = route.back,
        animationName = '',
        animationClass = '';

      animation = route.animation;
      if (reverse) {
        animationName = lastViewInstance ? lastViewInstance.animationName : animationName;
      }
      if (!animationName) {
        if ( (animation = route.animation) ) {
          if (angular.isFunction(animation) || angular.isArray(animation)) {
            animationName = $injector.invoke(animation, null, {
              $scope: scope,
              $routeParams: route.params
            });
          } else {
            animationName = animation;
          }
        } else {
          angular.forEach(viewInstance.element[0].className.split(' '), function(klass) {
            if ($injector.has('.' + klass + '-animation')) {
              animationName = animationName || klass;
            }
          });
        }
      }
      return {
        animationName: animationName,
        reverse: reverse
      };
    }

    function changeView(viewInstance, lastViewInstance) {
      if (lastViewInstance) {
        jqmViewCtrl.clearViewInstance(lastViewInstance);
        lastViewInstance.element.remove();
      }
      element.append(viewInstance.element);
    }

    function performViewAnimation(animationData, viewInstance, lastViewInstance) {

      var inElement = viewInstance.element,
        lastElement = lastViewInstance.element,
        animationName = viewInstance.animationName = maybeDegradeAnimation(animationData.animationName),
        reverse = animationData.reverse,
        viewportClass = "ui-mobile-viewport-transitioning viewport-" + animationName,
        pageActiveClass = 'ui-page-active',
        preInClass = 'ui-page-pre-in',
        addClasses = animationName + (reverse ? ' reverse' : ''),
        removeClasses = 'out in reverse ' + (lastViewInstance.animationName || ''),
        isSequential = (VIEW_ANIMATION_DEFS[animationName] || {}).sequential;

      // Set the new page to display:block but don't show it yet.
      // This code is from jquery mobile 1.3.1, function "createHandler".
      // Prevent flickering in phonegap container: see comments at #4024 regarding iOS
      inElement.css("z-index", -10);
      inElement.addClass(pageActiveClass + " " + preInClass);
      element.addClass(viewportClass);

      console.log('jqmView#performAnimation(): prep');
      $nextFrame(function() {
        if (cancelled) {
          return;
        }
        if (isSequential && lastElement) {
          console.log('jqmView#performAnimation(): leave');
          leave(enterAndFinish);
        } else {
          if (lastElement) {
            leave();
          }
          enterAndFinish();
        }
        function enterAndFinish() {
          console.log('jqmView#performAnimation(): enter');
          enter(pageAnimationsComplete);
        }
      });

      function enter(done) {
        inElement.removeClass(preInClass);

        //TODO replace with $animate.enter
        element.append(inElement);
        inElement.addClass(addClasses + ' in');

        inElement.css('z-index', '');
        $animationComplete(inElement, function() {
          inElement.removeClass('in out reverse ' + animationName);
          (done||angular.noop)();
        }, true);
      }
      function leave(done) {
        //TODO replace with $animate.leave
        lastElement.addClass(addClasses + ' out');

        jqmViewCtrl.clearViewInstance(lastViewInstance);
        $animationComplete(lastElement, function() {
          lastElement.removeClass(removeClasses + ' ' + pageActiveClass);
          lastElement.remove();
          (done||angular.noop)();
        }, true);
      }
      function pageAnimationsComplete() {
        console.log('jqmView#performAnimation(): complete');
        element.removeClass(viewportClass);
      }
    }

    function maybeDegradeAnimation(animationName) {
      if (!$sniffer.animations) {
        return '';
      } else if (!$sniffer.cssTransform3d) {
        return VIEW_ANIMATION_DEFS[animationName].fallback;
      }
      return animationName;
    }
  }

  function JqmViewCtrl($scope) {
    this.loadView = loadView;
    this.clearViewInstance = clearViewInstance;
    this.viewWatchAttr = 'jqmView';

    function loadView(templateUrl, template) {
      if (template) {
        return $q.when(compile(template));
      } else {
        return $http.get(templateUrl, {cache:$templateCache}).then(function(response) {
          return compile(response.data);
        });
      }
    }

    function clearViewInstance(viewInstance) {
      viewInstance.scope.$destroy();
      viewInstance.scope = null;
    }

    function compile(template) {
      var link = $compile(angular.element('<div></div>').html(template).children());
      var scope = $scope.$new();
      return {
        scope: scope,
        element: link(scope)
      };
    }
  }

  function clearScope($scope) {
    var prop;
    // clear all watchers, listeners and all non angular properties,
    // so we have a fresh scope!
    $scope.$$watchers = [];
    $scope.$$listeners = [];
    for (prop in $scope) {
      if ($scope.hasOwnProperty(prop) && prop.charAt(0) !== '$') {
        delete $scope[prop];
      }
    }
    $scope.$disconnect();
  }
}]);

