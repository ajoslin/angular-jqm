"use strict";
describe('jqmPanel', function() {
    //Cannot really compare markup with jqm, as we are doing it so differently
    //We will do some curosry markup tests but mostly test functionality here
    var $compile, scope, elm, ng, panel1, panel2, $window;

    beforeEach(module(function($provide) {
        $provide.value('$window', angular.mock.createMockWindow());
    }));
    beforeEach(inject(function(_$compile_, $rootScope, _$window_, $animator, $sniffer) {
        $window = _$window_;
        $compile = _$compile_;
        scope = $rootScope.$new();
        ng = testutils.ng;
        $sniffer.animations = true;
        $window.setTimeout.clear = function() {
            $window.setTimeout.queue.length = 0;
        };
        $window.setTimeout.clear();
    }));

    function setup(html1, html2) {
        panel1 = panel2 = null;
        ng.init('<div>');
        if (html1) {
            panel1 = $compile(html1)(scope);
            ng.viewPort.parent().append(panel1);
        }
        if (html2) {
            panel2 = $compile(html2)(scope);
            ng.viewPort.parent().append(panel2);
        }
        $compile(ng.viewPort.parent())(scope);
        scope.$apply();
        $window.setTimeout.clear();
    }

    function checkClasses(el, placement, display, isOpen) {
        placement = placement || 'left';
        display = display || 'reveal';
        angular.forEach([
            'ui-panel',
            'ui-panel-'+(isOpen ? 'open' : 'closed'),
            'ui-panel-position-'+placement,
            'ui-panel-display-'+display,
            'ui-panel-animate'
        ], function(cls) {
            expect(el).toHaveClass(cls);
        });
    }

    describe('basics', function() {
        it('should make panel with default options', function() {
            setup('<div jqm-panel>Content</div>');
            checkClasses(panel1);
        });
        it('should set options', function() {
            setup('<div jqm-panel display="push" position="right"></div>');
            checkClasses(panel1, 'right', 'push');
        });
        it('should throw error with bad position', function() {
            expect(function() {
                setup('<div jqm-panel position="andy"></div>');
            }).toThrow();
        });
        it('should create two panels', function() {
            setup('<div jqm-panel position="right"></div>', '<div jqm-panel position="left"></div>');
            checkClasses(panel1, 'right');
            checkClasses(panel2);
        });
        it('should put panels on scope.$panel', function() {
            setup('<div jqm-panel></div>', '<div jqm-panel position="right"></div>');
            expect(scope.$panel.left).toBeDefined();
            expect(scope.$panel.right).toBeDefined();
        });
        it('should bind open attr to $panel.opened', function() {
            setup('<div jqm-panel opened="foo"></div>');

            scope.$apply('foo=true');
            expect(scope.$panel.left.opened).toBe(true);
            $window.setTimeout.expect(1).process(); //class setup wait
            checkClasses(panel1, '', '', true);

            scope.$apply('$panel.left.opened = false');
            expect(scope.foo).toBe(false);
        });
        it('shoudl close one panel when another is opened', function() {
            setup('<div jqm-panel position="left"></div>','<div jqm-panel position="right"></div>');
            scope.$apply('$panel.left.opened = true');
            scope.$apply('$panel.right.opened = true');
            expect(scope.$panel.left.opened).toBe(false);
        });
    });
});
