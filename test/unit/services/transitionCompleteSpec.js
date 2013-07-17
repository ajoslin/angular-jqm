
"use strict";
describe('transitionComplete', function() {
    var $sniffer;
    it('throws an exception if the browser does not support css animations', inject(function($transitionComplete, $sniffer) {
        $sniffer.animations = false;
        expect(function() {
            $transitionComplete();
        }).toThrow();
    }));
    it('binds to transitionend if no vendorPrefix exists', inject(function($transitionComplete, $sniffer) {
        var el = angular.element('<div></div>'),
            spy = jasmine.createSpy();
        $sniffer.animations = true;
        $sniffer.vendorPrefix = '';
        spyOn(el, 'bind');
        $transitionComplete(el, spy);
        expect(el.bind).toHaveBeenCalledWith('transitionend', spy);
    }));
    it('binds to prefixed transitionend if vendorPrefix exists', inject(function($transitionComplete, $sniffer) {
        var el = angular.element('<div></div>'),
            spy = jasmine.createSpy();
        $sniffer.animations = true;
        $sniffer.vendorPrefix = 'Webkit';
        spyOn(el, 'bind');
        $transitionComplete(el, spy);
        expect(el.bind).toHaveBeenCalledWith('transitionend', spy);
        expect(el.bind).toHaveBeenCalledWith('webkitTransitionEnd', spy);
    }));
    it('should support once binding', inject(function($transitionComplete, $sniffer) {
        var el = angular.element('<div></div>');
        var spy = jasmine.createSpy('callback');

        $sniffer.animations = true;
        $sniffer.vendorPrefix = '';

        spyOn(el, 'unbind').andCallThrough();
        spyOn(el, 'bind').andCallThrough();

        $transitionComplete(el, spy, true);
        expect(el.bind.mostRecentCall.args[0]).toBe('transitionend');
        el.triggerHandler('transitionend');
        expect(el.unbind.mostRecentCall.args[0]).toBe('transitionend');
        expect(spy).toHaveBeenCalled();

        spy.reset();
        el.triggerHandler('transitionend');
        expect(spy).not.toHaveBeenCalled();
    }));
});
