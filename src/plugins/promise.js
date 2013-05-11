'use strict';

/**
 * This plugin require provide an implementation of promise interface at least with the methods:
 * defer and the object returned by defer implement: reject, resolve and promise # Minimal
 * interface inspired by Kris Kowal's Q (https://github.com/kriskowal/q)
 *
 * Implementation notes:
 *
 * Why this plugin wrap the adapter's method interface with callback parameter?
 * Promise interface alludes callback parameters in all the adapter's methods but, how adapters'
 * implementations aren't aware about it, because Lawnbench is base in NodeJs callbacks convention,
 * maybe some of these methods call to some other own methods internally providing an internal
 * wrapped callback, so in that case, this method require call to the internal method not the
 * implementation provided by this plugin.
 */


Lawnbench.plugin('promise', {

  init: function (qImpl) {

    if (!qImpl) {
      //throw new Error('This plugin require provide an implementation of promise interface');
      // Don't apply the plugins modifications because Q promise implementation has not been supplied
      return;
    }

    var self = this;
    var asyncInit = this.init;

    this.init = function (options, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncInit.call(self, options, callback);
        return;
      }

      var deferred;

      if (self._deferred_) {
        deferred = self._deferred_;
        delete self._deferred_;

      } else {

        deferred = qImpl.defer();
        self._deferred_ = deferred;

        asyncInit.call(self, options, function (err, lbInst) {
          if (err) {
            deferred.reject(err);
          } else {
            deferred.resolve(lbInst);
          }
        });

      }

      return deferred.promise;
    };

    var asyncSave = self.save;
    self.save = function (colName, obj, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncSave.call(self, colName, obj, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncSave.call(self, colName, obj, function (err, result) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(result);
        }
      });

      return deferred.promise;
    };


    var asyncBatch = self.batch;
    self.batch = function (colName, objs, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncBatch.call(self, colName, objs, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncBatch.call(self, colName, objs, function (err, results) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(results);
        }
      });

      return deferred.promise;
    };

    var asyncGet = self.get;
    self.get = function (colName, keyOrArray, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncGet.call(self, colName, keyOrArray, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncGet.call(self, colName, keyOrArray, function (err, results) {
        if (err) {
          deferred.reject(results);
        } else {
          deferred.resolve(results);
        }
      });

      return deferred.promise;
    };

    var asyncExists = self.exists;
    self.exists = function (colName, key, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncExists.call(self, colName, key, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncExists.call(self, colName, key, function (err, result) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(result);
        }
      });

      return deferred.promise;
    };

    var asyncAll = self.all;
    self.all = function (colName, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncAll.call(self, colName, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncAll.call(self, colName, function (err, results) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(results);
        }
      });

      return deferred.promise;
    };

    var asyncKeys = self.keys;
    self.keys = function (colName, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncKeys.call(self, colName, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncKeys.call(self, colName, function (err, result) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(result);
        }
      });

      return deferred.promise;
    };

    var asyncRemove = self.remove;
    self.remove = function (colName, keyOrArray, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncRemove.call(self, colName, keyOrArray, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncRemove.call(self, colName, keyOrArray, function (err) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve();
        }
      });

      return deferred.promise;
    };

    var asyncNuke = self.nuke;
    self.nuke = function (colName, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncNuke.call(self, colName, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncNuke.call(self, colName, function (err) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve();
        }
      });

      return deferred.promise;
    };

    var asyncNukeAll = self.nukeAll;
    self.nukeAll = function (callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncAll.call(self, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncNukeAll.call(self, function (err) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve();
        }
      });

      return deferred.promise;
    };

    var asyncCollectionNames = self.collectionNames;
    self.collectionNames = function (callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncCollectionNames.call(self, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncCollectionNames.call(self, function (err, results) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve(results);
        }
      });

      return deferred.promise;
    };

    var asyncGetCollection = self.getCollection;
    self.getCollection = function (colName, callback) {
      //Why callback parameter: see Note 1 on the main comments of this plugin (on top)
      if (callback) {
        asyncGetCollection.call(self, colName, callback);
        return;
      }

      var deferred = qImpl.defer();

      asyncGetCollection.call(self, colName, function (err, result) {
        if (err) {
          deferred.reject(err);
        } else {

          result.save = function (obj) {
            return self.save(colName, obj);
          };

          result.batch = function (objs) {
            return self.batch(colName, objs);
          };

          result.get = function (keyOrArray) {
            return self.get(colName, keyOrArray);
          };

          result.all = function () {
            return self.all(colName);
          };

          result.keys = function () {
            return self.keys(colName);
          };

          result.exists = function (key) {
            return self.exists(colName, key);
          };

          result.remove = function (keyOrArray) {
            return self.remove(colName, keyOrArray);
          };

          result.nuke = function () {
            return self.nuke(colName);
          };

          deferred.resolve(result);
        }
      });

      return deferred.promise;
    };
  }
});