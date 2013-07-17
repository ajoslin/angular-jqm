'use strict';

describe('jqmCachingView', function () {
    var someUrl = '/someUrl',
        someOtherUrl = '/someOtherUrl',
        someTemplateUrl = '/someTemplateUrl',
        someNonPageTemplateUrl = '/someNonPageTemplateUrl';

    function SomeCtrl($scope) {
        $scope.someCtrl = true;
        this.someCtrl = true;
    }

    describe('caching', function() {
        var viewEl;
        beforeEach(function() {
            module(function($routeProvider) {
                $routeProvider.when(someUrl, {
                    controller: SomeCtrl,
                    templateUrl: someTemplateUrl
                });
                $routeProvider.when(someOtherUrl, {
                    template: '<div></div>'
                });
                return function($templateCache, $compile, $rootScope) {
                    $templateCache.put(someTemplateUrl, '<div id="somePage" jqm-page>{{counter}}</div>');
                    $templateCache.put(someNonPageTemplateUrl, '<div></div>');
                    viewEl = $compile('<div jqm-caching-view></div>')($rootScope);
                };
            });
        });
        it('should precompile jqm pages in $templateCache into $jqmViewCache', inject(function($jqmViewCache) {
            var entry = $jqmViewCache.get(someTemplateUrl);

            expect(entry.elements.attr("id")).toBe("somePage");
            expect(entry.elements.scope()).toBe(entry.scope);
        }));

        it('should not precompile other elements in $templateCache into $jqmViewCache', inject(function($jqmViewCache, $templateCache) {
            expect($jqmViewCache.get(someNonPageTemplateUrl)).toBeUndefined();
        }));

        it('should update the controller in the cacheEntry on first access and reuse it afterwards', inject(function($jqmViewCache, $rootScope, $location, $route) {
            var entry = $jqmViewCache.get(someTemplateUrl);
            expect(entry.controller).toBeUndefined();
            $location.url(someUrl);
            $rootScope.$apply();
            expect(entry.controller.someCtrl).toBe(true);
            expect(entry.scope.someCtrl).toBe(true);
            expect(viewEl.children().data('$ngControllerController')).toBe(entry.controller);

            $location.url(someOtherUrl);
            $rootScope.$apply();
            expect(viewEl.children().data('$ngControllerController')).toBeUndefined();

            $location.url(someUrl);
            $rootScope.$apply();
            expect(viewEl.children().data('$ngControllerController')).toBe(entry.controller);
        }));

        it('should disconnect the scope when the entry is not used and reconnect it when used', inject(function($jqmViewCache, $rootScope, $location) {
            var entry = $jqmViewCache.get(someTemplateUrl),
                el = entry.elements;
            expect(entry.scope.$$disconnected).toBe(true);
            expect(entry.elements.text()).toBe("{{counter}}");

            $rootScope.counter = 1;
            $location.url(someUrl);
            $rootScope.$apply();
            expect(entry.scope.someCtrl).toBe(true);
            expect(entry.scope.$$disconnected).toBe(false);
            expect(el.text()).toBe('1');

            $location.url(someOtherUrl);
            $rootScope.$apply();
            expect(entry.scope.$$disconnected).toBe(true);

            $rootScope.counter = 2;
            $rootScope.$apply();
            expect(entry.scope.$$disconnected).toBe(true);
            expect(el.text()).toBe('1');

            $location.url(someUrl);
            $rootScope.counter = 3;
            $rootScope.$apply();
            expect(entry.scope.$$disconnected).toBe(false);
            expect(el.text()).toBe('3');
        }));

        it("should reuse the element and not destroy it's data", inject(function($jqmViewCache, $location, $rootScope) {
            var entry = $jqmViewCache.get(someTemplateUrl);
            $location.url(someUrl);
            $rootScope.$apply();
            expect(viewEl.children()[0]).toBe(entry.elements[0]);
            entry.elements.data('someKey', 'someValue');

            $location.url(someOtherUrl);
            $rootScope.$apply();
            expect(viewEl.children()[0]).not.toBe(entry.elements[0]);
            expect(viewEl.children().data('someKey')).toBeUndefined();

            $location.url(someUrl);
            $rootScope.$apply();
            expect(viewEl.children()[0]).toBe(entry.elements[0]);
            expect(viewEl.children().data('someKey')).toBe('someValue');
        }));
    });

    describe('details', function() {
        it('should fire $viewContentLoaded event not until directives with templateUrl have been loaded', function () {
            module(function ($compileProvider, $routeProvider) {
                $compileProvider.directive('test', function() {
                    return {
                        templateUrl: 'test.html'
                    };
                });
                $routeProvider.when('/foo', {template: '<div test></div>'});
            });

            inject(function ($templateCache, $rootScope, $location, $compile) {
                var element;
                $templateCache.put('test.html', 'template-url-content');
                $rootScope.$on('$viewContentLoaded', function() {
                    expect(element.text()).toBe('template-url-content');
                });
                element = $compile('<div jqm-caching-view></div>')($rootScope);
                $location.path('/foo');
                $rootScope.$digest();
            });
        });
        it('should fire $viewContentLoaded with the new element', function () {
            module(function ($compileProvider, $routeProvider) {
                $routeProvider.when('/foo', {template: '<div class="page"></div>'});
            });

            inject(function ($templateCache, $rootScope, $location, $compile) {
                var element;
                $templateCache.put('test.html', 'template-url-content');
                $rootScope.$on('$viewContentLoaded', function(event, element) {
                    expect(element).toHaveClass('page');
                });
                element = $compile('<div jqm-caching-view></div>')($rootScope);
                $location.path('/foo');
                $rootScope.$digest();
            });
        });
    });


    /**
     * Note: We copied the tests from angular's ngView over to here,
     * as we also copied parts of ngView into ngCachingView!
     */
    describe('original ngView specs', function () {
        var element;

        var jqLite = angular.element,
            noop = angular.noop,
            forEach = angular.forEach,
            nodeName_ = function (element) {
                return element.nodeName ? element.nodeName : element[0].nodeName;
            },
            dealoc = function (element) {
                element.remove();
            };

        beforeEach(module(function ($provide) {
            $provide.value('$window', angular.mock.createMockWindow());
            return function ($rootScope, $compile, $animator) {
                element = $compile('<div jqm-caching-view onload="load()"></div>')($rootScope);
                $animator.enabled(true);
            };
        }));


        afterEach(function () {
            dealoc(element);
        });


        it('should do nothing when no routes are defined',
            inject(function ($rootScope, $compile, $location) {
                $location.path('/unknown');
                $rootScope.$digest();
                expect(element.text()).toEqual('');
            }));


        it('should instantiate controller after compiling the content', function () {
            var log = [], controllerScope,
                Ctrl = function ($scope) {
                    controllerScope = $scope;
                    log.push('ctrl-init');
                };

            module(function ($compileProvider, $routeProvider) {
                $compileProvider.directive('compileLog', function () {
                    return {
                        compile: function () {
                            log.push('compile');
                        }
                    };
                });

                $routeProvider.when('/some', {templateUrl: '/tpl.html', controller: Ctrl});
            });

            inject(function ($route, $rootScope, $templateCache, $location) {
                $templateCache.put('/tpl.html', [200, '<div compile-log>partial</div>', {}]);
                $location.path('/some');
                $rootScope.$digest();

                expect(controllerScope.$parent).toBe($rootScope);
                expect(controllerScope).toBe($route.current.scope);
                expect(log).toEqual(['compile', 'ctrl-init']);
            });
        });


        it('should instantiate controller with an alias', function () {
            var log = [], controllerScope,
                Ctrl = function ($scope) {
                    this.name = 'alias';
                    controllerScope = $scope;
                };

            module(function ($compileProvider, $routeProvider) {
                $routeProvider.when('/some', {templateUrl: '/tpl.html', controller: Ctrl, controllerAs: 'ctrl'});
            });

            inject(function ($route, $rootScope, $templateCache, $location) {
                $templateCache.put('/tpl.html', [200, '<div></div>', {}]);
                $location.path('/some');
                $rootScope.$digest();

                expect(controllerScope.ctrl.name).toBe('alias');
            });
        });


        it('should support string controller declaration', function () {
            var MyCtrl = jasmine.createSpy('MyCtrl');

            module(function ($controllerProvider, $routeProvider) {
                $controllerProvider.register('MyCtrl', ['$scope', MyCtrl]);
                $routeProvider.when('/foo', {controller: 'MyCtrl', templateUrl: '/tpl.html'});
            });

            inject(function ($route, $location, $rootScope, $templateCache) {
                $templateCache.put('/tpl.html', [200, '<div></div>', {}]);
                $location.path('/foo');
                $rootScope.$digest();

                expect($route.current.controller).toBe('MyCtrl');
                expect(MyCtrl).toHaveBeenCalledWith(element.contents().scope());
            });
        });


        it('should load content via xhr when route changes', function () {
            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'myUrl1'});
                $routeProvider.when('/bar', {templateUrl: 'myUrl2'});
            });

            inject(function ($rootScope, $compile, $httpBackend, $location, $route) {
                expect(element.text()).toEqual('');

                $location.path('/foo');
                $httpBackend.expect('GET', 'myUrl1').respond('<div>{{1+3}}</div>');
                $rootScope.$digest();
                $httpBackend.flush();
                expect(element.text()).toEqual('4');

                $location.path('/bar');
                $httpBackend.expect('GET', 'myUrl2').respond('angular is da best');
                $rootScope.$digest();
                $httpBackend.flush();
                expect(element.text()).toEqual('angular is da best');
            });
        });


        it('should use inline content route changes', function () {
            module(function ($routeProvider) {
                $routeProvider.when('/foo', {template: '<div>{{1+3}}</div>'});
                $routeProvider.when('/bar', {template: 'angular is da best'});
                $routeProvider.when('/blank', {template: ''});
            });

            inject(function ($rootScope, $compile, $location, $route) {
                expect(element.text()).toEqual('');

                $location.path('/foo');
                $rootScope.$digest();
                expect(element.text()).toEqual('4');

                $location.path('/bar');
                $rootScope.$digest();
                expect(element.text()).toEqual('angular is da best');

                $location.path('/blank');
                $rootScope.$digest();
                expect(element.text()).toEqual('');
            });
        });


        it('should remove all content when location changes to an unknown route', function () {
            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'myUrl1'});
            });

            inject(function ($rootScope, $compile, $location, $httpBackend, $route) {
                $location.path('/foo');
                $httpBackend.expect('GET', 'myUrl1').respond('<div>{{1+3}}</div>');
                $rootScope.$digest();
                $httpBackend.flush();
                expect(element.text()).toEqual('4');

                $location.path('/unknown');
                $rootScope.$digest();
                expect(element.text()).toEqual('');
            });
        });


        it('should chain scopes and propagate evals to the child scope', function () {
            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'myUrl1'});
            });

            inject(function ($rootScope, $compile, $location, $httpBackend, $route) {
                $rootScope.parentVar = 'parent';

                $location.path('/foo');
                $httpBackend.expect('GET', 'myUrl1').respond('<div>{{parentVar}}</div>');
                $rootScope.$digest();
                $httpBackend.flush();
                expect(element.text()).toEqual('parent');

                $rootScope.parentVar = 'new parent';
                $rootScope.$digest();
                expect(element.text()).toEqual('new parent');
            });
        });


        it('should be possible to nest ngView in ngInclude', function () {

            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'viewPartial.html'});
            });

            inject(function ($httpBackend, $location, $route, $compile, $rootScope) {
                $httpBackend.whenGET('includePartial.html').respond('view: <div jqm-caching-view></div>');
                $httpBackend.whenGET('viewPartial.html').respond('content');
                $location.path('/foo');

                var elm = $compile(
                    '<div>' +
                        'include: <ng:include src="\'includePartial.html\'"> </ng:include>' +
                        '</div>')($rootScope);
                $rootScope.$digest();
                $httpBackend.flush();

                expect(elm.text()).toEqual('include: view: content');
                expect($route.current.templateUrl).toEqual('viewPartial.html');
                dealoc(elm);
            });
        });


        it('should discard pending xhr callbacks if a new route is requested before the current ' +
            'finished loading', function () {
            // this is a test for a bad race condition that affected feedback

            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'myUrl1'});
                $routeProvider.when('/bar', {templateUrl: 'myUrl2'});
            });

            inject(function ($route, $rootScope, $location, $httpBackend) {
                expect(element.text()).toEqual('');

                $location.path('/foo');
                $httpBackend.expect('GET', 'myUrl1').respond('<div>{{1+3}}</div>');
                $rootScope.$digest();
                $location.path('/bar');
                $httpBackend.expect('GET', 'myUrl2').respond('<div>{{1+1}}</div>');
                $rootScope.$digest();
                $httpBackend.flush(); // now that we have two requests pending, flush!

                expect(element.text()).toEqual('2');
            });
        });


        it('should be async even if served from cache', function () {
            module(function ($routeProvider) {
                $routeProvider.when('/foo', {controller: noop, templateUrl: 'myUrl1'});
            });

            inject(function ($route, $rootScope, $location, $templateCache) {
                $templateCache.put('myUrl1', [200, 'my partial', {}]);
                $location.path('/foo');

                var called = 0;
                // we want to assert only during first watch
                $rootScope.$watch(function () {
                    called++;
                    if (!called) {
                        expect(element.text()).toBe('');
                    }
                });

                $rootScope.$digest();
                expect(element.text()).toBe('my partial');
            });
        });

        it('should fire $contentLoaded event when content compiled and linked', function () {
            var log = [];
            var logger = function (name) {
                return function () {
                    log.push(name);
                };
            };
            var Ctrl = function ($scope) {
                $scope.value = 'bound-value';
                log.push('init-ctrl');
            };

            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'tpl.html', controller: Ctrl});
            });

            inject(function ($templateCache, $rootScope, $location) {
                $rootScope.$on('$routeChangeStart', logger('$routeChangeStart'));
                $rootScope.$on('$routeChangeSuccess', logger('$routeChangeSuccess'));
                $rootScope.$on('$viewContentLoaded', logger('$viewContentLoaded'));

                $templateCache.put('tpl.html', [200, '{{value}}', {}]);
                $location.path('/foo');
                $rootScope.$digest();

                expect(element.text()).toBe('bound-value');
                expect(log).toEqual([
                    '$routeChangeStart', '$routeChangeSuccess', 'init-ctrl', '$viewContentLoaded' ]);
            });
        });

        it('should destroy previous scope', function () {
            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'tpl.html'});
            });

            inject(function ($templateCache, $rootScope, $location) {
                $templateCache.put('tpl.html', [200, 'partial', {}]);

                expect($rootScope.$$childHead).toBeNull();
                expect($rootScope.$$childTail).toBeNull();

                $location.path('/foo');
                $rootScope.$digest();

                expect(element.text()).toBe('partial');
                expect($rootScope.$$childHead).not.toBeNull();
                expect($rootScope.$$childTail).not.toBeNull();

                $location.path('/non/existing/route');
                $rootScope.$digest();

                expect(element.text()).toBe('');
                expect($rootScope.$$childHead).toBeNull();
                expect($rootScope.$$childTail).toBeNull();
            });
        });


        it('should evaluate onload expression after linking the content', function () {
            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'tpl.html'});
            });

            inject(function ($templateCache, $location, $rootScope) {
                $templateCache.put('tpl.html', [200, '{{1+1}}', {}]);
                $rootScope.load = jasmine.createSpy('onload');

                $location.url('/foo');
                $rootScope.$digest();
                expect($rootScope.load).toHaveBeenCalled();
            });
        });


        it('should set $scope and $controllerController on the view', function () {
            function MyCtrl($scope) {
                $scope.state = 'WORKS';
                $scope.ctrl = this;
            }

            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'tpl.html', controller: MyCtrl});
            });

            inject(function ($templateCache, $location, $rootScope, $route) {
                $templateCache.put('tpl.html', [200, '<div>{{state}}</div>', {}]);

                $location.url('/foo');
                $rootScope.$digest();
                expect(element.text()).toEqual('WORKS');

                var div = element.find('div');
                expect(nodeName_(div.parent())).toEqual('DIV');

                expect(div.scope()).toBe($route.current.scope);
                expect(div.scope().hasOwnProperty('state')).toBe(true);
                expect(div.scope().state).toEqual('WORKS');

                expect(div.controller()).toBe($route.current.scope.ctrl);
            });
        });

        it('should not set $scope or $controllerController on top level text elements in the view', function () {
            function MyCtrl($scope) {
            }

            module(function ($routeProvider) {
                $routeProvider.when('/foo', {templateUrl: 'tpl.html', controller: MyCtrl});
            });

            inject(function ($templateCache, $location, $rootScope, $route) {
                $templateCache.put('tpl.html', '<div></div>  ');
                $location.url('/foo');
                $rootScope.$digest();

                forEach(element.contents(), function (node) {
                    if (node.nodeType === 3 /* text node */) {
                        expect(jqLite(node).scope()).not.toBe($route.current.scope);
                        expect(jqLite(node).controller()).not.toBeDefined();
                    } else {
                        expect(jqLite(node).scope()).toBe($route.current.scope);
                        expect(jqLite(node).controller()).toBeDefined();
                    }
                });
            });
        });

        describe('ngAnimate ', function () {
            var window, vendorPrefix;
            var body, element;

            function appendHtml(html) {
                var childs;
                body.append(html);
                childs = body.children();
                element = childs.eq(childs.length - 1);
                return element;
            }

            function applyCSS(element, cssProp, cssValue) {
                element.css(cssProp, cssValue);
                element.css(vendorPrefix + cssProp, cssValue);
            }

            beforeEach(function () {
                // we need to run animation on attached elements;
                body = jqLite(document.body);
            });

            afterEach(function () {
                dealoc(element);
            });

            beforeEach(module(function ($provide, $routeProvider) {
                $provide.value('$window', window = angular.mock.createMockWindow());
                $routeProvider.when('/foo', {controller: noop, templateUrl: '/foo.html'});
                return function ($sniffer, $templateCache, $animator) {
                    vendorPrefix = '-' + $sniffer.vendorPrefix + '-';
                    $templateCache.put('/foo.html', [200, '<div>data</div>', {}]);
                    $animator.enabled(true);
                };
            }));

            it('should fire off the enter animation + add and remove the css classes',
                inject(function ($compile, $rootScope, $sniffer, $location, $templateCache) {
                    element = $compile(appendHtml('<div jqm-caching-view ng-animate="{enter: \'custom-enter\'}"></div>'))($rootScope);

                    $location.path('/foo');
                    $rootScope.$digest();
                    //if we add the custom css stuff here then it will get picked up before the animation takes place
                    var child = jqLite(element.children()[0]);
                    applyCSS(child, 'transition', '1s linear all');

                    if ($sniffer.transitions) {
                        expect(child.attr('class')).toContain('custom-enter');
                        window.setTimeout.expect(1).process();

                        expect(child.attr('class')).toContain('custom-enter-active');
                        window.setTimeout.expect(1000).process();
                    } else {
                        expect(window.setTimeout.queue).toEqual([]);
                    }

                    expect(child.attr('class')).not.toContain('custom-enter');
                    expect(child.attr('class')).not.toContain('custom-enter-active');
                }));

            it('should fire off the leave animation + add and remove the css classes',
                inject(function ($compile, $rootScope, $sniffer, $location, $templateCache) {
                    $templateCache.put('/foo.html', [200, '<div>foo</div>', {}]);
                    element = $compile(appendHtml('<div jqm-caching-view ng-animate="{leave: \'custom-leave\'}"></div>'))($rootScope);

                    $location.path('/foo');
                    $rootScope.$digest();

                    //if we add the custom css stuff here then it will get picked up before the animation takes place
                    var child = jqLite(element.children()[0]);
                    applyCSS(child, 'transition', '1s linear all');

                    $location.path('/');
                    $rootScope.$digest();

                    if ($sniffer.transitions) {
                        expect(child.attr('class')).toContain('custom-leave');
                        window.setTimeout.expect(1).process();

                        expect(child.attr('class')).toContain('custom-leave-active');
                        window.setTimeout.expect(1000).process();
                    } else {
                        expect(window.setTimeout.queue).toEqual([]);
                    }

                    expect(child.attr('class')).not.toContain('custom-leave');
                    expect(child.attr('class')).not.toContain('custom-leave-active');
                }));

            it('should catch and use the correct duration for animations',
                inject(function ($compile, $rootScope, $sniffer, $location, $templateCache) {
                    $templateCache.put('/foo.html', [200, '<div>foo</div>', {}]);
                    element = $compile(appendHtml(
                        '<div ' +
                            'jqm-caching-view ' +
                            'ng-animate="{enter: \'customEnter\'}">' +
                            '</div>'
                    ))($rootScope);

                    $location.path('/foo');
                    $rootScope.$digest();

                    //if we add the custom css stuff here then it will get picked up before the animation takes place
                    var child = jqLite(element.children()[0]);
                    applyCSS(child, 'transition', '0.5s linear all');

                    if ($sniffer.transitions) {
                        window.setTimeout.expect(1).process();
                        window.setTimeout.expect($sniffer.transitions ? 500 : 0).process();
                    } else {
                        expect(window.setTimeout.queue).toEqual([]);
                    }
                }));


            it('should not double compile when route changes', function () {
                module(function ($routeProvider, $animationProvider, $provide) {
                    $routeProvider.when('/foo', {template: '<div ng-repeat="i in [1,2]">{{i}}</div>'});
                    $routeProvider.when('/bar', {template: '<div ng-repeat="i in [3,4]">{{i}}</div>'});
                    $animationProvider.register('my-animation-leave', function () {
                        return {
                            start: function (element, done) {
                                done();
                            }
                        };
                    });
                });

                inject(function ($rootScope, $compile, $location, $route, $window, $rootElement, $sniffer) {
                    element = $compile(appendHtml('<div jqm-caching-view onload="load()" ng-animate="\'my-animation\'"></div'))($rootScope);

                    $location.path('/foo');
                    $rootScope.$digest();
                    if ($sniffer.transitions) {
                        $window.setTimeout.expect(1).process();
                        $window.setTimeout.expect(0).process();
                    }
                    expect(element.text()).toEqual('12');

                    $location.path('/bar');
                    $rootScope.$digest();
                    expect(n(element.text())).toEqual('1234');
                    if ($sniffer.transitions) {
                        $window.setTimeout.expect(1).process();
                        $window.setTimeout.expect(1).process();
                    } else {
                        $window.setTimeout.expect(1).process();
                    }
                    expect(element.text()).toEqual('34');

                    function n(text) {
                        return text.replace(/\r\n/m, '').replace(/\r\n/m, '');
                    }
                });
            });
        });
    });
});
