"use strict";
ddescribe('jqmPageAnimation markup comparison with jqm', function () {
  beforeEach(module(function($provide) {
    $provide.factory('$nextFrame', function($timeout) {
      return $timeout;
    });
  }));
  var ng, jqm, somePage;

  function init(animation) {
    somePage = '/somePage';

    ng.init({
      '': { template: '<div jqm-page>initPage</div>' },
      '/somePage': {
        animation: animation,
        template: '<div jqm-page>somePage</div>'
      }
    });
    jqm.init({
      '': { template: '<div data-role="page"><div data-role="content">initPage</div></div>' },
      '/somePage': {
        animation: animation,
        template: '<div data-role="page"><div data-role="content">somePage</div></div>'
      }
    });
    inject(function($nextFrame) {
      $nextFrame.flush();
    });
  }

  beforeEach(function () {
    ng = testutils.ng;
    jqm = testutils.jqm;
  });

  function compareViewports() {
    testutils.compareElementRecursive(ng.viewPort, jqm.viewPort, /^page-.*/);
  }

  describe('with animations', function () {
    beforeEach(function () {
      ng.enableAnimations(true);
      jqm.enableAnimations(true);
    });

    describe('markup', function () {
      it('generates same markup as jqm for none transition', function () {
        init('none');
        // check state on startup
        expect(ng.activePage().text()).toContain('initPage');
        expect(jqm.activePage().text()).toContain('initPage');
        testutils.compareElementRecursive(ng.viewPort, jqm.viewPort, '^page-*');

        // go to second page
        ng.beginTransitionTo(somePage);
        jqm.beginTransitionTo(somePage);
        testutils.compareElementRecursive(ng.viewPort, jqm.viewPort);
        expect(ng.activePage().text()).toContain('somePage');
        expect(jqm.activePage().text()).toContain('somePage');

        // go back
        jqm.historyGo(-1);
        expect(jqm.activePage().text()).toContain('initPage');
        ng.historyGo(-1);
        expect(ng.activePage().text()).toContain('initPage');
      });

      iit('generates same markup as jqm for sequential transitions', function () {
        init('fade');
        // check state on startup
        expect(ng.activePage().text()).toContain('initPage');
        expect(jqm.activePage().text()).toContain('initPage');
        compareViewports();

        // go to second page
        ng.beginTransitionTo(somePage);
        jqm.beginTransitionTo(somePage);
        ng.fireAnimationEndEvents();
        jqm.fireAnimationEndEvents();
        ng.fireAnimationEndEvents();
        jqm.fireAnimationEndEvents();
        compareViewports();
        expect(ng.activePage().text()).toContain('somePage');
        expect(jqm.activePage().text()).toContain('somePage');
        
        // go back
        jqm.historyGo(-1);
        window.history.back();
        ng.scope.$apply();
        ng.tick(50);
        ng.fireAnimationEndEvents();
        jqm.fireAnimationEndEvents();
        ng.fireAnimationEndEvents();
        jqm.fireAnimationEndEvents();
        ng.fireAnimationEndEvents();
        jqm.fireAnimationEndEvents();
        compareViewports();
        if(1)return;
        expect(jqm.activePage().text()).toContain('initPage');
        expect(ng.activePage().text()).toContain('initPage');

      });
      it('generates same markup as jqm during parallel transitions', function () {
        init('slide');
        // check state on startup
        expect(ng.activePage().text()).toContain('initPage');
        expect(jqm.activePage().text()).toContain('initPage');
        compareViewports();

        // go to second page
        ng.beginTransitionTo(somePage);
        jqm.beginTransitionTo(somePage);
        compareViewports();
        ng.fireAnimationEndEvents();
        jqm.fireAnimationEndEvents();
        compareViewports();
        expect(ng.activePage().text()).toContain('somePage');
        expect(jqm.activePage().text()).toContain('somePage');

        // go back
        jqm.historyGo(-1);
        ng.historyGo(-1);
        compareViewports();
        ng.fireAnimationEndEvents();
        jqm.fireAnimationEndEvents();
        compareViewports();
        expect(ng.activePage().text()).toContain('initPage');
        expect(jqm.activePage().text()).toContain('initPage');
      });
    });

  });

  describe('without animations', function() {
    beforeEach(function () {
      ng.enableAnimations(false);
      jqm.enableAnimations(false);
    });
    it('generates same markup as jqm', function () {
      init('fade');
      // check state on startup
      expect(ng.activePage().text()).toContain('initPage');
      expect(jqm.activePage().text()).toContain('initPage');
      compareViewports();

      // go to second page
      ng.beginTransitionTo(somePage);
      jqm.beginTransitionTo(somePage);
      compareViewports();
      expect(ng.activePage().text()).toContain('somePage');
      expect(jqm.activePage().text()).toContain('somePage');

      // go back
      jqm.historyGo(-1);
      expect(jqm.activePage().text()).toContain('initPage');
      ng.historyGo(-1);
      expect(ng.activePage().text()).toContain('initPage');
    });

  });
});
