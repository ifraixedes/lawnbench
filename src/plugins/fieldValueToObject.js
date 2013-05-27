/**
 * This plugin require provide an implementation of promise interface at least with the methods:
 * defer and the object returned by defer implement: reject, resolve and promise # Minimal
 * interface inspired by Kris Kowal's Q (https://github.com/kriskowal/q)
 */


/**
 * Note 1: Why this plugin wrap the adapter's method interface with callback parameter?
 *
 * Promise interface alludes callback parameters in all the adapter's methods but, how adapters'
 * implementations aren't aware about it, because Lawnbench is base in NodeJs callbacks convention,
 * maybe some of these methods call to some other own methods internally providing an internal
 * wrapped callback, so in that case, this method require call to the internal method not the
 * implementation provided by this plugin.
 */
Lawnbench.plugin('fieldValueToObject', {

  init: function (options) {

    var self = this;
    var colsObjName;
    var colsObjKeyPathAttr;
    var autoKeyPath;
    // Flag to control if the call to one method comes from one overridden method for this plugin
    var intMethodCall = false;

    if (options.autoKeyPath[this.adapter]) {
      autoKeyPath = options.autoKeyPath[this.adapter];
    } else {
      throw new Error('Options doesn\'t contain the used id for auto key path of the adapter ' +
        this.adapter + '. It is a required option');
    }

    function isItWrappedObj(obj) {

      var countProp = 0;

      for (var p in obj) {
        countProp++;
        if (countProp <= 2) {
          if ((p !== autoKeyPath) && (p !== 'value')) {
            return false;
          }
        } else {
          return false;
        }
      }
      return true;
    }

    function mergeObjects(objsArray) {

      var mergedObj = {};
      var prop;

      for (var oi = 0; oi < objsArray.length; oi++) {
        for (prop in objsArray[oi]) {
          mergedObj[prop] = objsArray[oi][prop];
        }
      }

      return mergedObj;
    }

    function objToKeyValArrayFn(obj) {

      var keyValArray = [];
      var keyValObj;

      for (var k in obj) {
        keyValObj = {};
        keyValObj[autoKeyPath] = k;
        keyValObj['value'] = obj[k];

        keyValArray.push(keyValObj);
      }

      return keyValArray;
    }

    function keyValObjToObjFn(keyValWrappedObj) {
      var objToRet = {};
      try {
        objToRet[keyValWrappedObj[autoKeyPath]] = keyValWrappedObj['value'];
      } catch (e) {
        throw new Error('Provided parameters is not an object which fits to the expected '
          + 'Lawnbench\'s key-value wrapper object format');
      }
      return objToRet;
    }

    function arrayToObjectFn(lbFVObjsArray) {
      var objToRet = {};

      try {
        for (var v = 0; v < lbFVObjsArray.length; v++) {
          objToRet[lbFVObjsArray[v][autoKeyPath]] = lbFVObjsArray[v]['value'];
        }
      } catch (e) {
        throw new Error('Provided parameters is not an array or contains some object which ' +
          'doesn\'t fit to the expected Lawnbench\'s key-value wrapper object format');
      }

      return objToRet;
    }

    if (options.autoApply === true) {

      try {
        colsObjName = options.collectionsObject[this.adapter]['objName'];
        colsObjKeyPathAttr = options.collectionsObject[this.adapter]['keyPathAttr'];
      } catch (e) {
        throw new Error('Options doesn\'t contain an appropriated object descriptor of the ' +
          'collections management object of the adapter adapter ' + this.adapter + '. It is a ' +
          'required option if autoApply options is enabled: {objName: string, keyPathAttr: string}');
      }

      var lbSave = self.save;
      self.save = function (colName, obj, callback) {

        if (self[colsObjName][colName].hasOwnProperty([colsObjKeyPathAttr])) {
          lbSave.call(self, colName, obj, callback);
        } else {
          lbSave.call(self, colName, obj, function (err, sObj) {
            // If the returned object is not wrapped object then this method call internally
            // to other so the overridden method by this plugin has applied the transformation
            if ((sObj) && (isItWrappedObj(sObj))) {
              sObj = keyValObjToObjFn(sObj);
            }

            callback(err, sObj);

          });
        }
      };

      var lbBatch = self.batch;
      self.batch = function (colName, objs, callback) {


        if (self[colsObjName][colName].hasOwnProperty([colsObjKeyPathAttr])) {
          lbBatch.call(self, colName, objs, callback);
        } else {

          if (!self.isArray(objs)) {
            objs = objToKeyValArrayFn(objs);
          }

          lbBatch.call(self, colName, objs, function (err, sObjs) {
            if (sObjs) {
              // If one of the returned objects is not wrapped object then this method call internally
              // to other so the overridden method by this plugin has applied the transformation
              var oi;
              var transformed = false;

              for (oi = 0; oi < sObjs.length; oi++) {
                if (!isItWrappedObj(sObjs[oi])) {
                  transformed = true;
                  sObjs = mergeObjects(sObjs);
                  break;
                }
              }
              if (transformed === false) {
                sObjs = arrayToObjectFn(sObjs);
              }
            }

            callback(err, sObjs);
          });
        }
      };

      var lbGet = self.get;
      self.get = function (colName, keyOrArray, callback) {

        if (self[colsObjName][colName].hasOwnProperty([colsObjKeyPathAttr])) {
          lbGet.call(self, colName, keyOrArray, callback);
        } else {
          lbGet.call(self, colName, keyOrArray, function (err, result) {
            var ki;
            var mappedResult;

            if (err) {
              callback(err, result);
              return;
            }

            mappedResult = {};

            if (self.isArray(keyOrArray)) {

              if (self.isArray(result)) {
                for (ki = 0; ki < keyOrArray.length; ki++) {
                  mappedResult[keyOrArray[ki]] = result[ki];
                }

                callback(null, mappedResult);

              } else {
                callback(null, result);
              }

            } else {
              mappedResult[keyOrArray] = result;
              callback(null, mappedResult);
            }
          });
        }
      };
    }

    var lbAll = self.all;
    self.all = function (colName, callback) {

      if (self[colsObjName][colName].hasOwnProperty([colsObjKeyPathAttr])) {
        lbAll.call(self, colName, callback);
      } else {
        lbAll.call(self, colName, function (err, objs) {

          if (objs) {
            // If one of the returned objects is not wrapped object then this method call internally
            // to other so the overridden method by this plugin has applied the transformation
            var oi;
            var transformed = false;

            for (oi = 0; oi < objs.length; oi++) {
              if (!isItWrappedObj(objs[oi])) {
                transformed = true;
                objs = mergeObjects(objs);
                break;
              }
            }
            if (transformed === false) {
              objs = arrayToObjectFn(objs);
            }
          }
          callback(err, objs);
        });
      }
    };


    this.fieldValueToObject = keyValObjToObjFn;
    this.arrayFieldValueToObject = arrayToObjectFn;

  }
});