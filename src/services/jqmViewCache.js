jqmModule.provider('jqmViewCache', function () {
  //TODO document jqmViewCacheProvider.options()
  var options = {};
  return {
    options: function(newOptions) {
      options = newOptions;
    },
    $get: ['$cacheFactory', function($cacheFactory) {
      return $cacheFactory('jqmViewCache');
    }]
  };
});
