
function ViewChange(route, newView, oldView) {
  var animData = figureOutAnimation(route, newView, oldView),
    animationName = newView.animationName = animData.animationName,
    reverse = animationData.reverse,
    viewportClass = 'ui-mobile-viewport-transitioning viewport-' + animationName,
    pageActiveClass = 'ui-page-active',
    preInClass = 'ui-page-pre-in',
    addAnimClasses = animationName + (reverse ? ' reverse' : ''),
    removeAnimClasses = 'out in reverse ' + (oldView.animationName || ''),
    isSequential = (VIEW_ANIMATION_DEFS[animationName] || {}).sequential,
    finished = false,
    state = 'start';

  var unbindAnimationComplete = $animationComplete(element, onAnimationComplete);

  if (!oldView) {
    cancel();
  } else {
    start();
  }

  return {
    cancel: cancel
  };

  function start() {
    state = 'start';
    element.addClass(viewportClass);

    // Set the new page to display:block but don't show it yet.
    // This code is from jquery mobile 1.3.1, function "createHandler".
    // Prevent flickering in phonegap container: see comments at #4024 regarding iOS
    newView.element.css('z-index', -10);
    newView.element.addClass(pageActiveClass + ' ' + preInClass);

    $nextFrame(function() {
      if (finished) {
        return;
      }
      if (isSequential) {
        leave(enterAndFinish);
      } else {
        leave();
        enterAndFinish();
      }
    });
  }

  function enterAndFinish() {
    enter(finish);
  }

  function leave(done) {
    //TODO replace with animate.leave
    oldView.element.addClass(addAnimClasses + ' out');
    jqmViewCtrl.disconnectView(oldView);

    $animationComplete(lastElement, function() {
      leaveCleanup();
      (done || angular.noop);
    }, true);
  }
  function leaveCleanup() {
    lastElement.removeClass(removeAnimClasses + ' ' + pageActiveClass);
    jqmViewCtrl.removeView(oldView);
  }

  function enter(done) {
    newView.element.removeClass(preInClass);
    
    //TODO replace with animate.enter
    newView.element.addClass(addAnimClasses + ' in');
    newView.element.css('z-index', '');

    $animationComplete(newView.element, function() {
      enterCleanup();
      (done || angular.noop)();
    });
  }
  function enterCleanup() {
    newView.element.removeClass(removeAnimClasses + ' ' + preInClass);
    newView.element.css('z-index', '');
  }

  function cancel() {
    if (oldView) {
      jqmViewCtrl.disconnectView(oldView);
      leaveCleanup();
    }
    element.append(newView.element);
    enterCleanup();
    newView.element.addClass(pageActiveClass);

    finish();
  }

  function finish() {
    element.removeClass(viewportClass);
    finished = true;
  }
}

function View(options) {
  var template = options.template,
    templateUrl = options.templateUrl,
    cacheKey = templateUrl || template;

  var self = {
    load: load,
    enter: enter,
    leave: leave,
    element: null,
    scope: null
  };
  return self;

  function load(isCached) {
    var cacheKey = isCached && templateUrl || template;
    var cacheItem = isCached && compileCache.get(cacheKey);

    if (cacheItem) {
      self.scope = cacheItem.scope;
      self.element = cacheItem.element;
      return $q.when(self);
    } else if (template) {
      compile(template, cacheKey);
      return $q.when(self);
    } else {
      return $http.get(templateUrl, {cache:$templateCache}).then(function(response) {
        compile(response.data, cacheKey);
        return self;
      });
    }
  }

  function enter(parent, animationClasses, onDone) {
    var finished;
    // Set the new page to display:block but don't show it yet.
    // This code is from jquery mobile 1.3.1, function "createHandler".
    // Prevent flickering in phonegap container: see comments at #4024 regarding iOS
    self.element.css('z-index', -10);
    self.element.addClass('ui-page-active ui-page-pre-in');

    $nextFrame(function() {
      if (finished) {
        return;
      }
      self.element.removeClass('ui-page-pre-in');
      self.element.css('z-index', '');
      self.element.addClass(animationClasses + ' in');
      parent.append(self.element);

      $animationComplete(self.element, done, true);
    });

    function done() {
      if (finished) {
        return;
      }
      finished = true;
      self.element.removeClass(animationClasses + ' in ui-page-pre-in');
      self.element.css('z-index', '');
      (onDone || angular.noop)();
    }
    return done;
  }

  function leave(animationClasses, onDone) {
    var finished = false;
    self.element.addClass(addClasses + ' out');

    $animationComplete(self.element, done, true);

    function done() {
      if (finished) {
        return;
      }
      finished = true;
      self.element.removeClass(animationCLasses + ' out ui-page-active');
      (onDone || angular.noop)();
    }
  }

  function compile(template, cacheKey) {
    var link = $compile(angular.element('<div></div>').html(template).children());
    var scope = options.scope || scope.$new();

    self.scope = scope;
    self.element = link(scope);

    scope.$disconnect();

    if (cacheKey) {
      compileCache.put(cacheKey, {
        scope: self.scope,
        element: self.element
      });
    }
    return templateInstance;
  }
}
