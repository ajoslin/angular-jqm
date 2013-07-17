"use strict";
describe('jqmPageWrap', function() {
    var scope, $compile, elm, parent;
    beforeEach(inject(function($compile, $rootScope) {
        scope = $rootScope.$new();
        parent = angular.element('<div></div>');
        elm = angular.element('<div jqm-panel-content-wrap></div>');
        parent.append(elm);
        $compile(parent)(scope);
        scope.$apply();
    }));

    describe('ui-panel-dismiss', function() {
        var dismiss;
        beforeEach(function() {
            dismiss = parent.children().eq(1);
        });
        it('should have appended a dismiss element', function() {
            expect(dismiss).toBeTruthy();
            expect(dismiss).toHaveClass('ui-panel-dismiss');
        });
        it('with no $panel should not have open class', function() {
            expect(dismiss).not.toHaveClass('ui-panel-dismiss-open');
        });
        it('with open $panel should have open class, and accept events', function() {
            scope.$panel = { left: { opened: true } };
            scope.$apply();
            expect(dismiss).toHaveClass('ui-panel-dismiss-open');
            dismiss.triggerHandler('click');
            expect(scope.$panel.left.opened).toBe(false);
        });
    });

    describe('with no $panel', function() {
        it('should have no panel classes', function() {
            expect(elm[0].className).not.toMatch(/ui-panel/g);
        });
    });

    function makePanelTests(placement) {
        var otherPlacement =  placement === 'left' ? 'right' : 'left';
        describe('with $panel.'+placement, function() {
            beforeEach(function() {
                scope.$parent.$panel = {};
                scope.$panel[placement] = {};
                scope.$apply();
            });

            var displays = ['reveal', 'push', 'overlay'];
            angular.forEach(displays, function(display) {
                describe('opened with ' + display, function() {
                    beforeEach(function() {
                        scope.$panel[placement].opened = true;
                        scope.$panel[placement].display = display;
                        scope.$apply();
                    });

                    it('should have open class', function() {
                        expect(elm).toHaveClass('ui-panel-content-wrap-open');
                    });
                    it('should have open '+placement+' class', function() {
                        expect(elm).toHaveClass('ui-panel-content-wrap-position-'+placement);
                    });
                    it('should not have open class for other placement', function() {
                        expect(elm).not.toHaveClass('ui-panel-content-wrap-position-'+otherPlacement);
                    });

                    it('should have display ' + display + ' class and not others', function() {
                        angular.forEach(displays, function(otherDisplay) {
                            if (display === otherDisplay) {
                                expect(elm).toHaveClass('ui-panel-content-wrap-display-'+display);
                            } else {
                                expect(elm).not.toHaveClass('ui-panel-content-wrap-display-'+otherDisplay);
                            }
                        });
                    });
                });
            });
        });
    }
    makePanelTests('left');
    makePanelTests('right');
});
