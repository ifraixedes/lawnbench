'use strict';

/**
 * This plugin allows to change the behaviour of key-value collection's type.
 * When the plugin is applied, the method 'all' return a plain object, converting the returned
 * array of wrapper objects (key and value) in a object where the attributes are keys and their
 * values are the value.
 *
 * The method is possible to apply to the same way to 'get', and to the write operations
 * 'save' and 'batch', but applying the transformation in the opposite way.
 *
 * The plugin accepts the next options parameters:
 *  autoKeyPath: And object where each attribute's name is the id of the adapter, and their values
 *    are the name of the parameter used for the wrapper object used in key-value collections
 *  [autoApply]: Boolean that if it is 'true' then the transformation is auto applied in the
 *    methods: 'get', 'save', and 'batch'. By default false;
 *  [collectionsObject]: If autoApply is 'true', then this parameter is required and it is an object
 *    that each attribute name is the adapter's name and the value must be an object with these
 *    attributes:
 *      # objName: The name of the property (adapter) that holds the information related to the
 *        collections to identify if the collection is a key-value or document (Object) collection.
 *      # keyPathAttr: The name of the property, that for each collection indentified in the
 *        variable that keeps the collection's type, holds the name of the property/attribute
 *        that define the key in the key-value wrapper object.
 *
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

      for(var k in obj) {
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
            if (result) {
              if (self.isArray(result)) {
                // If one of the returned objects is not wrapped object then this method call internally
                // to other so the overridden method by this plugin has applied the transformation
                var oi;
                var transformed = false;

                for (oi = 0; oi < result.length; oi++) {
                  if (!isItWrappedObj(result[oi])) {
                    transformed = true;
                    result = mergeObjects(sObjs);
                    break;
                  }
                }
                if (transformed === false) {
                  result = arrayToObjectFn(result);
                }
              } else {
                // If the returned object is not wrapped object then this method call internally
                // to other so the overridden method by this plugin has applied the transformation
                if (isItWrappedObj(result)) {
                  result = keyValObjToObjFn(result);
                }
              }
            }
            callback(err, result);
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