'use strict'

/**
 *
 * valid: check if the the adapter require more options parameters than usual
 * init options:
 *  # [autoKeyPath]: if it is not specified then 'id' will be used
 *  # [db]: and instance object where the data will be attached; mainly expected and empty object
 *  # if not provided an internal object will be used.
 *  # collections: ** can be objects with
 *    # name: collection name
 *    # [keyPath]: the element to store is an object, then this is the name of the property to
 *    use like a key
 *    # [autoGenKey]: the element to store is an object, if it is true, and the object does't
 *    have the keyPath attribute and the attribute will be attached to the object with an auto
 *    generated value and it will be used like a key; if false or not specified then the key will
 *    not be generated and if the object doesn't have the keyPath attribute, then an error will be
 *    returned. If keyPath is not defined then value to store can be a primitives (string, integers
 *    and so on) or an object that it doesn't contain its own key value so if you would like specify a
 *    key or you need because autoGenKey is false or not specified then you need to wrap the value
 *    into an object that contains two attributes:
 *    {
 *      @id: The value of the key; @id is the a name specified by "autoKeyPath" option
 *      value: The value to store (primitive or object)
 *    }
 *    other attribute will be ignored and if 'value' attributes, in the wrapper object, doesn't exist,
 *    and an error will be returned, unlike @id attribute, because to allow to store object doesn't
 *    contains its own key, with an autognerated key, so if you value is an object and you would like
 *    autogenate the key you need put the object to store into the 'value' attribute of the wrapper
 *    object.
 *
 *
 * Methods obj (depends of the collections option definition) param may be an object or value of
 * any type that it doesn't self contain its key, so if you would like to provide a key for it
 * rather than autogenerate one, then you can wrap it into an object with this two attributes
 *
 * {
 *  id: the key to use (the name of this property can be overridden by the options.autoKeyPath
 *    parameter)
 *  value: the value to store
 * }
 *
 */

Lawnbench.adapter('memory', (function () {

  var checkOptionsCollections = function (options) {
    var i;
    // check required parameters collections description
    for (i = 0; i < options.collections.length; i++) {
      if ('object' === typeof options.collections[i]) {
        if (options.collections[i] === null) {
          return false;
        }

        if (!options.collections[i].name) {
          return false;
        }

        if ((options.collections[i].keyPath) &&
          ('string' !== typeof options.collections[i].keyPath)) {
          return false;
        }
      }
    }

    return true;
  };

  var checkOptionsWithoutCollections = function (options) {

    if ((options.db) &&
      (('object' !== typeof options.db) || (options.db === null))) {
      return false;
    }

    if ((options.autoKeyPath) && ('string' !== typeof options.autoKeyPath)) {
      return false;
    }

    if ((options.freezeObjects) && ('boolean' !== typeof options.freezeObjects)) {
      return false;
    }

    return true;
  };


  // To make obj fully immutable, freeze each object in obj.
  // To do so, we use this function.
  var deepFreeze = function (obj) {
    var prop;
    var propKey;

    if (('object' !== typeof obj) || (obj === null)) {
      return obj;
    }


    Object.freeze(obj);
    // First freeze the object.
    for (propKey in obj) {
      prop = obj[propKey];
      if (!obj.hasOwnProperty(propKey) || (typeof prop !== 'object') || (prop === null) ||
        Object.isFrozen(prop)) {
        // If the object is on the prototype, not an object, or is already frozen,
        // skip it. Note that this might leave an unfrozen reference somewhere in the
        // object if there is an already frozen object containing an unfrozen object.
        continue;
      }

      deepFreeze(prop); // Recursively call deepFreeze.
    }

    return obj;
  };


  var Memory = function () {

    // ensure Lawnbench was called as a constructor
    if (!(this instanceof Memory)) return new Memory();


    this.colStores = {};
    this.autoKeyPath = 'id';
    this.freezeObjects = false;
    this.extDb = false;
  };


  Memory.valid = function (options) {

    // if options is provided then it will check the options, otherwise the adapter is valid
    // although the initialization may fail if the required options are not supplied
    if (!options) {
      return true;
    }

    return checkOptionsCollections(options) && checkOptionsWithoutCollections(options);
  };

  Memory.prototype = {

    init: function (options, callback) {

      if (!checkOptionsWithoutCollections(options)) {
        throw new Error('the provided options are not valid for this adapter');
      }


      // Create the new objects store.
      var i;
      var collection;
      var self = this;

      var cbWrapper = function (err) {
        if (callback) {
          self.lambda(callback)(err, self);
        }
      };


      this.freezeObjects = ((!options.freezeObjects) || (!Object.freeze)) ? false : true;

      if (options.autoKeyPath) {
        this.autoKeyPath = options.autoKeyPath;
      }

      if (options.db) {
        this.extDb = {};
      }

      // set the collections store settings
      for (i = 0; i < this.collections.length; i++) {
        collection = this.collections[i];

        if ('string' === typeof collection) {
          collection = {
            name: this.collections[i]
          };
        }

        if (collection.keyPath) {
          if ((collection.autoGenKey) && (collection.autoGenKey === true)) {
            this.colStores[collection.name] = {
              autoGenKey: true,
              keyPath: collection.keyPath
            };
          } else {
            this.colStores[collection.name] = {
              autoGenKey: false,
              keyPath: collection.keyPath
            };
          }
        } else {
          if ((collection.autoGenKey) && (collection.autoGenKey === true)) {
            this.colStores[collection.name] = {
              autoGenKey: true
            };
          } else {
            this.colStores[collection.name] = {
              autoGenKey: false
            };
          }
        }

        this.colStores[collection.name].store = {};

        if (options.db) {
          if (!options.db.hasOwnProperty(collection.name)) {
            this.extDb[collection.name] = options.db[collection.name] = {};
          } else {
            this.extDb[collection.name] = {};
          }
        }
      }

      // Database was provided
      if (options.db) {
        var colName;
        var eleName;

        // migrating current collections if are exists in the new collections list
        for (colName in options.db) {
          if (options.db.hasOwnProperty(colName)) {
            if (this.colStores[colName]) {
              // Make a copy of the collection of the current database into it new one
              if (('object' === typeof options.db[colName]) && (options.db[colName] !== null)) {
                if (this.freezeObjects) {
                  for (eleName in options.db[colName]) {
                    this.colStores[colName].store[eleName] = this.extDb[colName][eleName] =
                      deepFreeze(JSON.parse(JSON.stringify(options.db[colName][eleName])));
                  }
                } else {
                  this.colStores[colName].store =
                    this.extDb[colName] = JSON.parse(JSON.stringify(options.db[colName]));
                }

                options.db[colName] = this.extDb[colName];
              }
            }
          }

        }
      }

      cbWrapper(null);
      return this;
    },

    /** It is possible that the obj parameter is frozen  because the method doesn't make a copy of it**/
    save: function (colName, obj, callback) {

      var self = this;
      var collection = this.colStores[colName];
      var resultObj = {};

      var cbWrapper = function (err, result) {
        if (callback) {
          self.lambda(callback)(err, result);
        }
      };

      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }


      if (collection.keyPath !== undefined) {
        if (!obj.hasOwnProperty(collection.keyPath)) {
          if (collection.autoGenKey === false) {
            cbWrapper(new Error('Object doesn\'t contain its key and autogenrate was not enabled'),
              null);
            return this;
          } else {
            obj[collection.keyPath] = this.uuid();
          }
        }

        collection.store[obj[collection.keyPath]] = (this.freezeObjects) ? deepFreeze(obj) : obj;
        resultObj = obj;
      } else {
        if ('object' === typeof obj) {
          if (!obj.hasOwnProperty('value')) {
            cbWrapper(new Error('Collection without key path specified and the value has been ' +
              'wrapped into an object that doesn\'t have the \'value\' property (it is required)'),
              null);
            return this;
          }

          if (obj.hasOwnProperty(this.autoKeyPath)) {
            resultObj[this.autoKeyPath] = obj[this.autoKeyPath];
            collection.store[obj[this.autoKeyPath]] =
              (this.freezeObjects) ? deepFreeze(obj.value) : obj.value;
          } else {
            if (collection.autoGenKey === true) {
              resultObj[this.autoKeyPath] = this.uuid();
              collection.store[resultObj[this.autoKeyPath]] =
                (this.freezeObjects) ? deepFreeze(obj.value) : obj.value;
            } else {
              cbWrapper(new Error('Wapprer object without key: ' + this.autoKeyPath +
                ' attribute ' +
                ' and the autogenerated key was not enabled so it is required.'), null);
              return this;
            }
          }
          resultObj.value = obj.value;
        } else {
          // Freeze is not needed because the value is a primitive
          if (collection.autoGenKey === true) {
            resultObj[this.autoKeyPath] = this.uuid();
            collection.store[resultObj[this.autoKeyPath]] = obj;
          } else {
            cbWrapper(new Error('value to store that it doesn\'t have its own key and the ' +
              'autogenerated key was not enabled so it is required a wrapper'), null);
            return this;
          }

          resultObj.value = obj;
        }
      }

      try {
        if (this.extDb) {
          if (collection.keyPath !== undefined) {
            this.extDb[colName][obj[collection.keyPath]] = obj;
          } else {
            this.extDb[colName][resultObj[this.autoKeyPath]] = resultObj.value;
          }
        }
      } catch (e) {
        // Ignore !!!
        // This catch is to capture throw errors when accessing to undefined stores on external
        //db if it was used and was modified externally
      }

      cbWrapper(null, resultObj);
      return this;
    },

    batch: function (colName, objs, callback) {
      var self = this;

      var cbWrapper = function (err, results) {
        if (callback) {
          self.lambda(callback)(err, results)
        }
      };

      if (!this.isArray(objs)) {
        cbWrapper(new Error('Required objects parameter of array type'));
        return this;
      }

      var results = [];
      var done = objs.length;
      var errors = [];
      var numErrors = 0;

      if (!this.colStores[colName]) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      var putOne = function (i) {
        self.save(colName, objs[i], function (err, obj) {

          if (err) {
            numErrors++;
            errors[i] = err;
          } else {
            errors[i] = null;
          }

          results[i] = obj;

          if ((--done) > 0) { return; }

          if (numErrors > 0) {
            cbWrapper(errors, results);
          } else {
            cbWrapper(null, results);
          }

        });
      };

      for (var i = 0, l = objs.length; i < l; i++) {
        putOne(i);
      }

      return this;
    },

    get: function (colName, keyOrArray, callback) {

      var self = this;
      var collection = this.colStores[colName];
      var item;

      var cbWrapper = function (err, results) {
        if (callback) {
          self.lambda(callback)(err, results);
        }
      };

      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      if (!this.isArray(keyOrArray)) {
        cbWrapper(null, collection.store[keyOrArray]);
      } else {

        var results = [];
        var errors = [];
        var numErrors = 0;
        var done = keyOrArray.length;
        var keys = keyOrArray;

        var getOne = function (i) {
          self.get(colName, keys[i], function (err, obj) {

            if (err) {
              numErrors++;
              errors[i] = err;
            } else {
              results[i] = null;
            }

            results[i] = obj;

            if ((--done) > 0) { return; }
            if (callback) {
              if (numErrors > 0) {
                cbWrapper(errors, results);
              } else {
                cbWrapper(null, results);
              }
            }
          });
        };

        for (var i = 0, l = keys.length; i < l; i++) {
          getOne(i);
        }
      }

      return this;
    },

    exists: function (colName, key, callback) {
      var self = this;
      var collection = this.colStores[colName];


      var cbWrapper = function (err, result) {
        if (callback) {
          self.lambda(callback)(err, result)
        }
      };

      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      cbWrapper(null, (collection.store[key]) ? true : false);

      return this;
    },

    all: function (colName, callback) {

      var self = this;
      var collection = this.colStores[colName];

      var cbWrapper = function (err, result) {
        if (callback) {
          self.lambda(callback)(err, result);
        }
      };


      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      var toReturn = [];
      var key;
      var element;

      if (collection.keyPath) {
        for (key in collection.store) {
          toReturn.push(collection.store[key]);
        }
      } else {
        for (key in collection.store) {
          element = {
            value: collection.store[key]
          };

          element[this.autoKeyPath] = key;

          toReturn.push(element);
        }
      }


      cbWrapper(null, toReturn);

      return this;
    },

    keys: function (colName, callback) {
      var self = this;
      var collection = this.colStores[colName];

      var cbWrapper = function (err, result) {
        if (callback) {
          self.lambda(callback)(err, result);
        }
      };

      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      if (Object.keys) {
        cbWrapper(null, Object.keys(collection.store));
      } else {
        var keys = [];
        var key;
        for (key in collection.store) {
          keys.push(key);
        }
        cbWrapper(null, keys);
      }

      return this;
    },

    remove: function (colName, keyOrArray, callback) {

      var self = this;
      var collection = this.colStores[colName];

      var cbWrapper = function (err) {
        if (callback) {
          self.lambda(callback)(err);
        }
      };

      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      if (!this.isArray(keyOrArray)) {
        delete collection.store[keyOrArray];

        if (this.extDb) {
          try {
            delete this.extDb[colName][keyOrArray];
          } catch (e) {
            // Ignore !!!
            // This catch is to capture throw errors when accessing to undefined stores on external
            //db if it was used and was modified externally
          }
        }

      } else {
        var k;
        for (k = 0; k < keyOrArray.length; k++) {
          delete collection.store[keyOrArray[k]];

          if (this.extDb) {
            try {
              delete this.extDb[colName][keyOrArray[k]];
            } catch (e) {
              // Ignore !!!
              // This catch is to capture throw errors when accessing to undefined stores on external
              //db if it was used and was modified externally
            }
          }
        }
      }

      cbWrapper(null);
      return this;
    },

    nuke: function (colName, callback) {
      var self = this;
      var collection = this.colStores[colName];

      var cbWrapper = function (err) {
        if (callback) {
          self.lambda(callback)(err);
        }
      };

      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      collection.store = {};

      if (this.extDb) {
        try {
          this.extDb[colName] = {};
        } catch (e) {
          // Ignore !!!
          // This catch is to capture throw errors when accessing to undefined stores on external
          //db if it was used and was modified externally
        }
      }

      cbWrapper(null);
      return this;
    },

    nukeAll: function (callback) {

      var key;
      var colName;

      for (colName in this.colStores) {
        this.colStores[colName].store = {};

        if (this.extDb) {
          try {
            this.extDb[colName] = {};
          } catch (e) {
            // Ignore !!!
            // This catch is to capture throw errors when accessing to undefined stores on external
            //db if it was used and was modified externally
          }
        }
      }

      if (callback) {
        this.lambda(callback)(null);
      }
      return this;
    },

    collectionNames: function (callback) {

      var keys;
      var key;

      if (Object.keys) {
        keys = Object.keys(this.colStores);
      } else {
        keys = [];

        for (key in collection.store) {
          keys.push(key);
        }
      }

      if (callback) {
        this.lambda(callback)(null, keys);
      }

      return this;
    },

    getCollection: function (colName, callback) {

      var self = this;

      if (callback) {
        this.lambda(callback)(null,
          {
            save: function (obj, callback) {
              self.save(colName, obj, callback);
            },
            batch: function (objs, callback) {
              self.batch(colName, objs, callback);
            },
            get: function (keyOrArray, callback) {
              self.get(colName, keyOrArray, callback);
            },
            all: function (callback) {
              self.all(colName, callback);
            },
            keys: function (callback) {
              self.keys(colName, callback);
            },
            exists: function (key, callback) {
              self.exists(colName, key, callback);
            },
            remove: function (keyOrArray, callback) {
              self.remove(colName, keyOrArray, callback);
            },
            nuke: function (callback) {
              self.nuke(colName, callback);
            }

          });
      }

      return this;
    }
  };

  return Memory;

})());
