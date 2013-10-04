/**
 * @ngdoc directive
 * @name jqm.directive:jqmView
 * @restrict ECA
 *
 * @description
 * # Overview
 * `jqmView` extends `ngView` in the following way:
 *
 * - animations can also be specified on routes using the `animation` property (see below).
 * - animations can also be specified in the template using the `view-animation` attribute on a root element.
 * - when the user hits the back button, the last animation is executed with the `-reverse` suffix.
 * - instead of using `$route` an expression can be specified as value of the directive. Whenever
 *   the value of this expression changes `jqmView` updates accordingly.
 * - content that has been declared inside of `ngView` stays there, so you can mix dynamically loaded content with
 *   fixed content.
 *
 * @param {expression=} jqmView angular expression evaluating to a route.
 *
 *   * `{string}`: This will be interpreted as the url of a template.
 *   * `{object}`: A route object with the same properties as `$route.current`:
 *   - `templateUrl` - `{string=}` - the url for the template
 *   - `controller` - `{string=|function()=}` - the controller
 *   - `controllerAs` - `{string=}` - the name of the controller in the scope
 *   - `locals` - `{object=}` - locals to be used when instantiating the controller
 *   - `back` - `{boolean=}` - whether the animation should be executed in reverse
 *   - `animation` - `{string=|function()=}` - the animation to use. If `animation` is a function it will
 *    be called using the `$injector` with the extra locals `$routeParams` (`route.params`) and `$scope` (the scope of `jqm-view`).
 *
 * @scope
 * @example
 <example module="jqmView">
 <file name="index.html">
 Choose:
 <a href="#/Book/Moby">Moby</a> |
 <a href="#/Book/Moby/ch/1">Moby: Ch1</a> |
 <a href="#/Book/Gatsby">Gatsby</a> |
 <a href="#/Book/Gatsby/ch/4?key=value">Gatsby: Ch4</a> |
 <a href="#/Book/Scarlet">Scarlet Letter</a><br/>

 <div jqm-view style="height:300px"></div>
 </file>

 <file name="book.html">
 <div jqm-page>
 <div jqm-header><h1>Book {{book.params.bookId}}</h1></div>
 The book contains ...
 </div>
 </file>

 <file name="chapter.html">
 <div jqm-page>
 <div jqm-header><h1>Chapter {{chapter.params.chapterId}} of {{chapter.params.bookId}}</h1></div>
 This chapter contains ...
 </div>
 </file>

 <file name="script.js">
 angular.module('jqmView', ['jqm'], function($routeProvider) {
      $routeProvider.when('/Book/:bookId', {
      templateUrl: 'book.html',
      controller: BookCntl,
      controllerAs: 'book',
      animation: 'page-slide'
      });
      $routeProvider.when('/Book/:bookId/ch/:chapterId', {
      templateUrl: 'chapter.html',
      controller: ChapterCntl,
      controllerAs: 'chapter',
      animation: 'page-slide'
      });
    });

 function BookCntl($routeParams) {
      this.params = $routeParams;
    }

 function ChapterCntl($routeParams) {
      this.params = $routeParams;
    }
 </file>
 </example>
 */
false && jqmModule.directive('jqmView', ['$templateCache', '$route', '$anchorScroll', '$compile',
  '$controller', '$animator', '$http', '$q', '$injector',
  function ($templateCache, $route, $anchorScroll, $compile, $controller, $animator, $http, $q, $injector) {
    return {
      restrict: 'ECA',
      controller: ['$scope', JqmViewCtrl],
      require: 'jqmView',
      compile: function (element, attr) {
        element.children().attr('view-fixed', 'true');
        return link;
      }
    };
    function link(scope, element, attr, jqmViewCtrl) {
      var lastScope,
        lastContents,
        lastAnimationName,
        onloadExp = attr.onload || '',
        animateAttr = {},
        animate = $animator(scope, animateAttr),
        jqmViewExpr = attr[jqmViewCtrl.watchAttrName],
        changeCounter = 0;
      if (!jqmViewExpr) {
        watchRoute();
      } else {
        watchRouteExp(jqmViewExpr);
      }

      function watchRoute() {
        scope.$on('$routeChangeSuccess', update);
        update();

        function update() {
          routeChanged($route.current);
        }
      }


      function watchRouteExp(routeExp) {
        // only shallow watch (e.g. change of route instance)
        scope.$watch(routeExp, routeChanged, false);
      }

      function routeChanged(route) {
        // For this counter logic, see ngIncludeDirective!
        var thisChangeId = ++changeCounter,
          $template;
        if (!route || angular.isString(route)) {
          route = {
            templateUrl: route
          };
        }
        $template = route.locals && route.locals.$template;
        var url = route.loadedTemplateUrl || route.templateUrl || $template;
        if (url) {
          // Note: $route already loads the template. However, as it's also
          // using $templateCache and so does loadAndCompile we don't get extra $http requests.
          jqmViewCtrl.loadAndCompile(url, $template).then(function (templateInstance) {
            if (thisChangeId !== changeCounter) {
              return;
            }
            templateLoaded(route, templateInstance);
          }, function () {
            if (thisChangeId === changeCounter) {
              clearContent();
            }
            clearContent();
          });
        } else {
          clearContent();
        }
      }

      function clearContent() {
        var contents = angular.element();
        angular.forEach(element.contents(), function(element) {
          var el = angular.element(element);
          if (!el.attr('view-fixed')) {
            contents.push(element);
          }
        });

        jqmViewCtrl.onClearContent(contents);
        animate.leave(contents, element);
        if (lastScope) {
          lastScope.$destroy();
          lastScope = null;
        }
      }

      function templateLoaded(route, templateInstance) {
        var locals = route.locals || {},
          controller;
        calcAnimation(route, templateInstance);
        clearContent();
        animate.enter(templateInstance.elements, element);

        lastScope = locals.$scope = templateInstance.scope;
        route.scope = lastScope;
        lastContents = templateInstance.elements;

        if (route.controller) {
          controller = $controller(route.controller, locals);
          if (route.controllerAs) {
            lastScope[route.controllerAs] = controller;
          }
          element.children().data('$ngControllerController', controller);
        }
        lastScope.$emit('$viewContentLoaded', templateInstance.elements);
        lastScope.$eval(onloadExp);
        // $anchorScroll might listen on event...
        $anchorScroll();
      }

      function calcAnimation(route, templateInstance) {
        var animation,
          reverse = route.back,
          routeAnimationName,
          animationName;
        if (attr.ngAnimate) {
          animateAttr.ngAnimate = attr.ngAnimate;
          return;
        }
        animation = route.animation;
        if (angular.isFunction(animation) || angular.isArray(animation)) {
          routeAnimationName = $injector.invoke(route.animation, null, {
            $scope: scope,
            $routeParams: route.params
          });
        } else {
          routeAnimationName = animation;
        }
        if (!routeAnimationName) {
          angular.forEach(templateInstance.elements, function (element) {
            var el = angular.element(element);
            routeAnimationName = routeAnimationName || el.attr('view-animation') || el.attr('data-view-animation');
          });
        }
        if (reverse) {
          animationName = lastAnimationName;
          if (animationName) {
            animationName += "-reverse";
          }
        } else {
          animationName = routeAnimationName;
        }
        lastAnimationName = routeAnimationName;
        if (animationName) {
          animateAttr.ngAnimate = "'" + animationName + "'";
        } else {
          animateAttr.ngAnimate = "''";
        }
      }
    }

    function JqmViewCtrl($scope) {
      this.watchAttrName = 'jqmView';
      this.loadAndCompile = loadAndCompile;
      this.onClearContent = angular.noop;

      function loadAndCompile(templateUrl, template) {
        if (template) {
          return $q.when(compile(template));
        } else {
          return $http.get(templateUrl, {cache: $templateCache}).then(function (response) {
            return compile(response.data);
          });
        }
      }

      function compile(template) {
        var link = $compile(angular.element('<div></div>').html(template).contents());
        var scope = $scope.$new();
        return {
          scope: scope,
          elements: link(scope)
        };
      }
    }
  }]);
