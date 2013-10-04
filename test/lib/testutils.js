//ie10 & mobile safari need a long time sometimes to load the iframe
jasmine.getEnv().defaultTimeoutInterval = 25000;

(function (window, document) {
    var exports,
        IGNORE_CSS_CLASSES = /(ng-.*)|(jqm.*)/,
        ONLY_BASIC_TRANSITIONS = "basic";
    beforeEach(initIfNeeded);
    beforeEach(function () {
        exports.jqm._beforeEach();
        exports.ng._beforeEach();
    });
    afterEach(function () {
        exports.jqm._afterEach();
        exports.ng._afterEach();
    });

    // API
    exports = window.testutils = {
        compareElementRecursive: compareElementRecursive,
        compareElement: compareElement,
        fireEvent: fireEvent,
        ng: null, // is filled in #initIfNeeded with an instance of CommonApi
        jqm: null // is filled in #initIfNeeded with an instanceof of CommonApi
    };

    // ---------
    function initIfNeeded() {
        if (exports.jqm) {
            return;
        }
        var jqmWin;
        runs(function () {
            var iframe = document.createElement("iframe");
            iframe.src = "/base/test/lib/jqmPage.html";
            // Cross browser way for onload iframe handler
            if (iframe.attachEvent) {
                iframe.attachEvent('onload', iframeDone);
            } else {
                iframe.onload = iframeDone;
            }
            function iframeDone() {
                    jqmWin = iframe.contentWindow;
            }
            document.body.appendChild(iframe);
        });
        waitsFor(function () {
            return jqmWin;
        });
        runs(function () {
            exports.jqm = new JqmUtils(jqmWin);
            exports.ng = new NgUtils();
        });
    }

    // ----------
    // CommonApi api
    function CommonApi() {

    }

    CommonApi.prototype = {
        _beforeEach: angular.noop,
        _afterEach: angular.noop,
        tick: notImplemented,
        init: notImplemented,
        beginTransitionTo: notImplemented,
        historyGo: notImplemented,
        // needs to be called before init.
        enableAnimations: notImplemented,
        fireAnimationEndEvents: function () {
            fireAnimationEndEventsInWindow(this.viewPort[0]);
        },
        activePage: function () {
            return this.viewPort.children();
        }
    };

    // -------
    // jqm utils

    function JqmUtils(win) {
        this.win = win;
        this.pageAttr = 'data-role="page"';
        this.$ = win.$;
        var self = this,
            $ = this.$;
        this.$.ajax = function (data) {
            var res = $.Deferred(),
                pathname = $.mobile.path.parseUrl(data.url).pathname;
            var templateEntry = self.templateCache[pathname];
            if (data.success) {
                res.done(data.success);
            }
            if (data.error) {
                res.fail(data.error);
            }
            if (templateEntry) {
                res.resolve(templateEntry.template);
            } else {
                res.reject("Could not find a template for path " + pathname);
            }
            return res;
        };
    }

    JqmUtils.prototype = new CommonApi();

    JqmUtils.prototype._beforeEach = function () {
        this.templateCache = {};
        this.win.location.hash = '';
    };

    JqmUtils.prototype._afterEach = function () {
        if (this.viewPort) {
            // make sure that all animations and timeouts are finished!
            this.fireAnimationEndEvents();
            this.tick(10000);
            this.fireAnimationEndEvents();
            this.tick(10000);
        }
    };

    JqmUtils.prototype.tick = function (millis) {
        this.win.jasmine.Clock.tick(millis);
    };

    JqmUtils.prototype.init = function (pages) {
        var self = this,
            win = this.win,
            $ = this.$,
            resultFn = function () {
                return self.viewPort;
            };
        if (typeof pages === 'string') {
            pages = generatedPages(pages)
        }

        clearJqmState();
        this.viewPort = $("<div></div>").appendTo("body");
        addPages();
        $.mobile.initializePage();
        // Hide the loader div from the dom
        // as we do not support it yet in angular-jqm.
        // Only detach it but do not destroy it's widget!
        detachNode($(".ui-loader")[0]);
        return resultFn();

        function clearJqmState() {
            self.viewPort = null;
            if ($.mobile.pageContainer) {
                $.mobile.pageContainer.remove();
                delete $.mobile.pageContainer;
            }
            delete $.mobile.loaderWidget;
            delete $.mobile.firstPage;
            delete $.mobile.activePage;
            var urlHistory = $.mobile.urlHistory;
            urlHistory.stack.splice(1, urlHistory.stack.length - 1);
            urlHistory.activeIndex = 0;
        }

        function addPages() {
            var pageUrl, page, firstPage;
            for (pageUrl in pages) {
                page = pages[pageUrl];
                if (!pageUrl) {
                    pageUrl = win.location.pathname;
                    initFirstPage(page);
                    firstPage = page;
                }
                page.animation = page.animation || 'none';
                self.templateCache[pageUrl] = page;
            }
            if (!firstPage) {
                throw new Error("There is not explicit first page (with empty null)");
            }
        }

        function initFirstPage(firstPage) {
            var $firstPage = $(firstPage.template);
            self.viewPort.append($firstPage);
            // Remove the first page when it it hidden from the DOM,
            // so we have the same behavior as for external pages
            // in jqm.
            // However, save the firstJqmPage in the templateCache,
            // so we are able to go back later!
            $firstPage.on('pagehide', function () {
                $(this).remove();
            });
        }

        function generatedPages(inputStr) {
            var $input = $(inputStr),
                pageStr;
            if ($input.attr('data-role') === 'page') {
                pageStr = inputStr;
                resultFn = function () {
                    return self.viewPort.children();
                }
            } else {
                pageStr = '<div ' + self.pageAttr + '><div data-role="content">' + inputStr + '</div></div>';
                resultFn = function () {
                    return self.viewPort.children().children().children();
                }
            }
            return {
                '': {
                    template: pageStr
                }
            };
        }
    };

    JqmUtils.prototype.beginTransitionTo = function (url) {
        var templateEntry = this.templateCache[url];
        this.$.mobile.changePage(url, {
            transition: templateEntry.animation
        });
    };

    JqmUtils.prototype.historyGo = function (relativeIndex) {
        var $ = this.$,
            urlHistory = $.mobile.urlHistory,
            newIndex = urlHistory.activeIndex + relativeIndex;
        if (newIndex < 0 || newIndex >= urlHistory.stack.length) {
            throw new Error("new history index " + newIndex + " is out of range");
        }
        this.win.location.hash = urlHistory.stack[newIndex].hash;
        $.mobile.navigate.navigator.preventNextHashChange = false;
        var jqmEvent = $.Event();
        jqmEvent.type = 'hashchange';
        $(this.win).triggerHandler("hashchange");
        // $.event.special.navigate.hashchange(jqmEvent);
    };

    JqmUtils.prototype.enableAnimations = function (enable) {
        var $ = this.$;
        $.support.cssTransitions = !!enable;
        $.support.cssTransform3d = enable !== ONLY_BASIC_TRANSITIONS;
    };

    // -------
    // angular utils
    function NgUtils() {
        this.win = window;
        this.$ = angular.element;
        this.pageAttr = 'jqm-page';
    }

    NgUtils.prototype = new CommonApi();

    NgUtils.prototype._beforeEach = function () {
        var self = this;
        window.jasmine.Clock.useMock();
        module("jqm", function ($routeProvider) {
            self.$routeProvider = $routeProvider;
        });
    };

    NgUtils.prototype._afterEach = function () {
        inject(function ($rootElement) {
            detachNode($rootElement[0]);
        });
        // make sure that all timeouts are finished!
        this.tick(10000);
    };

    NgUtils.prototype.tick = function (millis) {
        window.jasmine.Clock.tick(millis);
    };

    NgUtils.prototype.init = function (pages) {
        var self = this,
            $ = self.$,
            resultFn = function () {
                return self.viewPort;
            };
        if (typeof pages === 'string') {
            pages = generatePages(pages);
        }
        inject(function ($rootElement, $compile, $rootScope, $location, $templateCache, $animate) {
            addPages(pages);
            self.viewPort = $("<div jqm-caching-view></div>");
            $($rootElement).append(self.viewPort);
            document.body.appendChild($rootElement[0]);
            self.scope = $rootScope.$new();
            $compile(self.viewPort)(self.scope);
            $location.path('/');
            $rootScope.$apply();
            // Note: angular does not start animations until the first $apply is finished.
            // We have to simulate this here also!
            $animate.enabled(true);

            function addPages() {
                var pageUrl, firstPage, page;
                for (pageUrl in pages) {
                    page = pages[pageUrl];
                    if (!pageUrl) {
                        firstPage = page;
                        pageUrl = '/';
                    }
                    $templateCache.put(pageUrl, page.template);
                    self.$routeProvider.when(pageUrl, {
                        templateUrl: pageUrl,
                        animation: page.animation
                    });
                }
                if (!firstPage) {
                    throw new Error("There is not explicit first page (with empty null)");
                }
            }
        });
        return resultFn();

        function generatePages(inputStr) {
            var $input = $(inputStr),
                pageStr;
            if ($input.attr('jqm-page') !== undefined) {
                pageStr = inputStr;
                resultFn = function () {
                    return self.viewPort.children();
                }
            } else {
                pageStr = '<div ' + self.pageAttr + '>' + inputStr + '</div>';
                resultFn = function () {
                    return self.viewPort.children().children().children();
                }
            }
            return {
                '': {
                    template: pageStr
                }
            };
        }
    };

    NgUtils.prototype.beginTransitionTo = function (url) {
        inject(function ($location, $rootScope, $timeout) {
            $location.url(url);
            $rootScope.$apply();
        });
        this.tick(1);
        inject(function($timeout) {
          $timeout.flush();
        });
    };

    NgUtils.prototype.historyGo = function (relativeIndex) {
        inject(function ($history, $location, $rootScope) {
            var newIndex = $history.activeIndex + relativeIndex;
            if (newIndex < 0 || newIndex >= $history.urlStack.length) {
                throw new Error("new history index " + newIndex + " is out of range");
            }
            $location.path($history.urlStack[newIndex].url);
            $rootScope.$apply();
        });
        this.tick(1);
    };

    NgUtils.prototype.enableAnimations = function (enable) {
        module("jqm", function ($provide) {
            $provide.decorator("$sniffer", function ($delegate) {
                $delegate.animations = !!enable;
                $delegate.transitions = !!enable;
                $delegate.cssTransform3d = enable !== ONLY_BASIC_TRANSITIONS;
                return $delegate;
            });
        });
    };

    // ------
    // CommonApi utils
    function notImplemented() {
        throw new Error("not implemented!");
    }

    function detachNode(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    function compareElementRecursive(el1, el2, ignoreClassRegex) {
        var res,
            counters = [0, 0],
            children,
            child1, child2;
        el1 = normalizeNode(el1);
        el2 = normalizeNode(el2);
        compareElement(el1, el2, ignoreClassRegex);
        children = [el1.contents(), el2.contents()];
        do {
            child1 = nextChild(0);
            child2 = nextChild(1);
            if (child1 || child2) {
                compareElementRecursive(child1, child2, ignoreClassRegex);
            }
        } while (child1 || child2);

        function nextChild(elementIndex) {
            var curr;
            while (counters[elementIndex] < children[elementIndex].length) {
                curr = children[elementIndex].eq(counters[elementIndex]++);
                if (curr[0].nodeType === Node.TEXT_NODE) {
                    // ignore empty text nodes
                    if (curr.text().trim().length > 0) {
                        return curr;
                    }
                } else if (curr[0].nodeType === Node.ELEMENT_NODE) {
                    return curr;
                }
            }
        }

        function normalizeNode(el) {
            // Normalize interpolated text of angular to the actual text node.
            if (el && el[0] && el[0].nodeName === 'SPAN' && el[0].className === 'ng-scope') {
                return el.contents();
            }
            return el;
        }
    }

    function compareElement(el1, el2, ignoreClassRegex) {

        var el1Empty = (!el1 || !el1[0]),
            el2Empty = (!el2 || !el2[0]);
        if (el1Empty ^ el2Empty) {
            error("node does not exist on other side", el1, el2);
        }
        if (el1[0].nodeType !== el2[0].nodeType) {
            error("node types differ", el1, el2);
        }
        if (el1[0].nodeName !== el2[0].nodeName) {
            error("node names differ", el1, el2);
        }
        if (el1[0].nodeType === Node.TEXT_NODE) {
            if (el1.text().trim() !== el2.text().trim()) {
                error("text differs", el1, el2);
            }
        }
        if (el1[0].nodeType === Node.ELEMENT_NODE) {
            var el1Classes = convertListToHash(el1[0].className.split(/\s+/)),
                el2Classes = convertListToHash(el2[0].className.split(/\s+/));

            containsAllClasses(el1Classes, el2Classes);
            containsAllClasses(el2Classes, el1Classes);
        }

        function containsAllClasses(el1Classes, el2Classes) {
            var prop;
            for (prop in el2Classes) {
                if (prop && 
                    !IGNORE_CSS_CLASSES.test(prop) && 
                    !(prop in el1Classes) &&
                    !(ignoreClassRegex && RegExp(ignoreClassRegex).test(prop))) {
                    error("classes differ: " + prop, el1, el2);
                }
            }
        }

        function error(text, el1, el2) {
            throw new Error('compareElement: ' + text + ". " + elementToString(el1) + " " + elementToString(el2));
        }
    }

    function convertListToHash(list) {
        var i, res = {};
        for (i = 0; i < list.length; i++) {
            res[list[i]] = true;
        }
        return res;
    }

    function elementToString(el) {
        if (!el || !el[0]) {
            return '[null]';
        }
        if (el[0].nodeType === Node.TEXT_NODE) {
            return '[text:' + el.text() + ']';
        }
        var doc = el[0].ownerDocument,
            div = doc.createElement('div');
        div.appendChild(el[0].cloneNode(false));
        var str = div.innerHTML;
        return str.replace(/<\/.*/g, '');
    }

    function fireAnimationEndEventsInWindow(rootEl) {
        // TODO: Use a more generic approach here,
        // that even works if the browser does not support animations!
        // A generic "fireEvent" function, that first
        // instrumented Element.prototype.addEventListener
        // and afterwards triggers those listeners manually,
        // simulating event bubbling, ...
        fireEvent(rootEl.querySelectorAll(".in,.out"), "animationend");
    }

    function fireEvent(elements, eventName, event) {
        // TODO: also support touch, click, keydown, ...
        var i, el, evt;
        for (i = 0; i < elements.length; i++) {
            el = elements[i];
            evt = el.ownerDocument.createEvent("Event");
            evt.initEvent(eventName, true, false);
            angular.extend(evt, event || {});
            el.dispatchEvent(evt);
        }
    }
})(window, document);
