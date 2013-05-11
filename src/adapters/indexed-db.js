'use strict'

/**
 * indexed db adapter
 * ===
 *
 * The code has been baked from the indexed db adapter of Lawnchair project
 * - originally authored by Vivian Li
 *
 */


/**
 *
 * valid: check if the the adapter require more options parameters than usual
 * init options:
 *  # [dbVersion]: the version of the database to use, if the version is older than version of the current
 *    database then an error will be returned, if it greater, then the database will be deleted
 *    and recreated (it is needed if the collections are added, removed or changed the structure),
 *    otherwise the current database will be opened (checking if the all the collections specified
 *    with the collections into the current database) and if it doesn't exist it will be created.
 *  # [autoKeyPath]: if it is not specified then 'id' will be used
 *  # [recreate]: boolean. True to delete the database (if it exists) and create a new one when
 *    init will be executed, otherwise the database will be open o created if it doesn't exist.
 *  # collections: Are objects with:
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
 *
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
 * {
 *  id: the key to use (the name of this property can be overridden by the options.autoKeyPath parameter)
 *  value: the value to store
 * }
 */

Lawnbench.adapter('indexed-db', (function () {

  // Private helper functions
  var getIDB = function () {
    return window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB ||
      window.msIndexedDB;
  };
  var getIDBTransaction = function () {
    return window.IDBTransaction || window.webkitIDBTransaction ||
      window.mozIDBTransaction || window.oIDBTransaction ||
      window.msIDBTransaction;
  };
  var getIDBKeyRange = function () {
    return window.IDBKeyRange || window.webkitIDBKeyRange ||
      window.mozIDBKeyRange || window.oIDBKeyRange ||
      window.msIDBKeyRange;
  };
  var getIDBDatabaseException = function () {
    return window.IDBDatabaseException || window.webkitIDBDatabaseException ||
      window.mozIDBDatabaseException || window.oIDBDatabaseException ||
      window.msIDBDatabaseException;
  };

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
    if ((options.dbVersion) && ('number' !== typeof options.dbVersion)) {
      return false;
    }

    if ((options.autoKeyPath) && ('string' !== typeof options.autoKeyPath)) {
      return false;
    }
    return true;
  };


  // using preliminary mozilla implementation which doesn't support
  // auto-generated keys.  Neither do some webkit implementations.
  var useAutoIncrement = !!window.indexedDB;


  // see https://groups.google.com/a/chromium.org/forum/?fromgroups#!topic/chromium-html5/OhsoAQLj7kc
  var READ_WRITE = (getIDBTransaction() &&
    'READ_WRITE' in getIDBTransaction()) ?
    getIDBTransaction().READ_WRITE : 'readwrite';


  var idb = getIDB();

  var IndexDB = function () {

    // ensure Lawnbench was called as a constructor
    if (!(this instanceof IndexDB)) return new IndexDB();

    this.ready = false;
    this.waiting;
    this.db;
    this.objStoreIdx; // Attributes of each objStoreIdx element autoKey and [keypath]
    this.autoKeyPath = 'id';
  };


  IndexDB.valid = function (options) {
    if (!idb) {
      return false;
    }

    // if options is provided then it will check the options, otherwise the adapter is valid
    // although the initialization may fail if the required options are not supplied
    if (!options) {
      return true;
    }

    return checkOptionsCollections(options) && checkOptionsWithoutCollections(options);
  };

  IndexDB.prototype = {

    init: function (options, callback) {

      if (!checkOptionsWithoutCollections(options)) {
        throw new Error('the provided options are not valid for this adapter');
      }

      this.waiting = [];
      this.objStoreIdx = {};
      var request;
      var self = this;

      var cbWrapper = function (err) {
        // manually clean up event handlers on request; this helps on chrome
        // uncommend if it is needed
        //if (request) request.onupgradeneeded = request.onsuccess = request.error = null;

        if (callback) {
          return self.lambda(callback)(err, self);
        }
      };


      var upgrade = function (from, to) {

        var i;
        var collection;

        // No migration will be done, delete all the object stores
        for (i = 0; i < self.db.objectStoreNames.length; i++) {
          try {
            self.db.deleteObjectStore(self.db.objectStoreNames[i]);
          } catch (e2) { /* ignore */ }
        }

        // Create the new objects store.
        for (i = 0; i < self.collections.length; i++) {
          collection = self.collections[i];

          if ('string' === typeof collection) {
            collection = {
              name: self.collections[i]
            };
          }

          if (collection.keyPath) {
            if ((collection.autoGenKey) && (collection.autoGenKey === true)) {

              self.db.createObjectStore(collection.name, {
                autoIncrement: useAutoIncrement,
                keyPath: collection.keyPath
              });

              self.objStoreIdx[collection.name] = {
                autoGenKey: true,
                keyPath: collection.keyPath
              };
            } else {
              self.db.createObjectStore(collection.name, {
                autoIncrement: false,
                keyPath: collection.keyPath
              });
              self.objStoreIdx[collection.name] = {
                autoGenKey: false,
                keyPath: collection.keyPath
              };
            }

          } else {
            if ((collection.autoGenKey) && (collection.autoGenKey === true)) {
              self.db.createObjectStore(collection.name, {
                autoIncrement: useAutoIncrement
              });

              self.objStoreIdx[collection.name] = {
                autoGenKey: true
              };
            } else {
              self.db.createObjectStore(collection.name, {
                autoIncrement: false
              });

              self.objStoreIdx[collection.name] = {
                autoGenKey: false
              };
            }
          }
        }

        self.ready = true;
      };


      if (options.autoKeyPath) {
        this.autoKeyPath = options.autoKeyPath;
      }

      if (options.recreate === true) {
        idb.deleteDatabase(this.dbName);
      }

      if (options.dbVersion) {
        request = idb.open(this.dbName, options.dbVersion);
      } else {
        request = idb.open(this.dbName);
      }

      request.onupgradeneeded = function (event) {
        self.db = request.result;

        upgrade(event.oldVersion, event.newVersion);
        // will end up in onsuccess callback
      };
      request.onsuccess = function (event) {
        self.db = request.result;

        var dbVersion = (options.dbVersion) ? options.dbVersion : self.db.version;

        // deny open the database if the current version is greater than the requested
        if (self.db.version > dbVersion) {
          self.db.close();
          cbWrapper(new Error('Open database denied because the current database\'s version is ' +
            'greater than the requested version. Current: ' + self.db.version + ' - Requested: ' +
            dbVersion));

          return this;
        }


        if (self.db.version != ('' + dbVersion)) {
          // DEPRECATED API: modern implementations will fire the
          // upgradeneeded event instead.
          var oldVersion = self.db.version;
          var setVrequest = self.db.setVersion('' + dbVersion);
          // onsuccess is the only place we can create Object Stores
          setVrequest.onsuccess = function (event) {
            var transaction = setVrequest.result;
            setVrequest.onsuccess = setVrequest.onerror = null;
            // can't upgrade w/o versionchange transaction.
            upgrade(oldVersion, dbVersion);
            transaction.oncomplete = function () {
              for (var i = 0; i < this.waiting.length; i++) {
                this.waiting[i].call(self);
              }
              this.waiting = [];
              cbWrapper();
            };
          };
          setVrequest.onerror = function (e) {
            setVrequest.onsuccess = setVrequest.onerror = null;
            //console.log("Failed to create objectstore " + e);
            cbWrapper(e.target);
          };
        } else {

          var collection;
          // Check if all the collections exist in the current database, if not an upgrade is needed
          if (!self.ready) {
            try {
              if (self.db.objectStoreNames.length !== self.collections.length) {
                throw new Error();
              }

              for (i = 0; i < self.collections.length; i++) {
                if (self.indexOf(self.db.objectStoreNames, self.collections[i].name) < 0) {
                  throw new Error();
                } else {
                  collection = self.collections[i];

                  if ('string' === typeof collection) {
                    collection = {
                      name: self.collections[i]
                    };
                  }

                  if (collection.keyPath) {
                    if ((collection.autoGenKey) && (collection.autoGenKey === true)) {
                      self.objStoreIdx[collection.name] = {
                        autoGenKey: true,
                        keyPath: collection.keyPath
                      };
                    } else {
                      self.objStoreIdx[collection.name] = {
                        autoGenKey: false,
                        keyPath: collection.keyPath
                      };
                    }
                  } else {
                    if ((collection.autoGenKey) && (collection.autoGenKey === true)) {
                      self.objStoreIdx[collection.name] = {
                        autoGenKey: true
                      };
                    } else {
                      self.objStoreIdx[collection.name] = {
                        autoGenKey: false
                      };
                    }
                  }
                }
              }
            }
            catch (e) {
              cbWrapper(new Error('The specified collections don\'t correspond with the database ' +
                'object stores, and no upgraded has been requested. Try to open the database with ' +
                'requesting a new version of it; current version: ' + self.db.version));

              self.db.close();
              return this;
            }
          }

          self.ready = true;
          // release memory, we don't need more this attribute because the collections are setup
          // in objStoreIdx attribute and indexeddb has a method to get the list of the store names;
          delete self.collections;

          for (var i = 0; i < self.waiting.length; i++) {
            self.waiting[i].call(self);
          }

          self.waiting = [];
          cbWrapper();
        }
      }

      request.onerror = function (ev) {

        if (request.errorCode === getIDBDatabaseException().VERSION_ERR) {
          // xxx blow it away
          idb.deleteDatabase(self.dbName);
          // try it again.
          return self.init(options, callback);
        }

        cbWrapper(ev.target);
      };

      return this;
    },

    save: function (colName, obj, callback) {
      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          self.save(colName, obj, callback);
        });

        return this;
      }

      var request;
      var collection = self.objStoreIdx[colName];
      var resultObj = {};
      var trans = this.db.transaction(colName, READ_WRITE);
      var store = trans.objectStore(colName);


      var cbWrapper = function (err, result) {
        // manually clean up event handlers on request; this helps on chrome
        // uncommend if it is needed
        //if (request) request.onupgradeneeded = request.onsuccess = request.error = null;

        if (callback) {
          if (result) {
            if (resultObj.addKey) {
              resultObj[self.autoKeyPath] = result.target.result;
              delete resultObj.addKey;
            } else {
              resultObj = obj;
            }
          } else {
            resultObj = null;
          }

          self.lambda(callback)(err, resultObj);
        }
      };

      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      if (collection.keyPath) {
        if (obj[collection.keyPath] === undefined) {
          if (!collection.autoGenKey) {
            cbWrapper(new Error('Object doesn\'t contain its key and autogenrate was not enabled'));
            return this;
          } else {
            if (!useAutoIncrement) {
              obj[collection.keyPath] = this.uuid();
            }
          }
        }

        request = store.put(obj);
        resultObj.addKey = false;
      } else {
        if ('object' === typeof obj) {
          if (!obj.value) {
            cbWrapper(new Error('Collection without key path specified and the value has been ' +
              'wrapped into an object that doesn\'t have the \'value\' property (it is required)'));
            return this;
          }

          if (obj[this.autoKeyPath]) {
            request = store.put(obj.value, obj[this.autoKeyPath]);
          } else {
            if (collection.autoGenKey) {
              if (useAutoIncrement) {
                request = store.put(obj.value);
              } else {
                request = store.put(obj.value, this.uuid());
              }
            } else {
              cbWrapper(new Error('Wapprer object without key: ' + this.autoKeyPath +
                ' attribute ' +
                ' and the autogenerated key was not enabled so it is required.'));
              return this;
            }
          }

          resultObj.value = obj.value;
        } else {
          if (collection.autoGenKey) {
            if (useAutoIncrement) {
              request = store.put(obj);
            } else {
              request = store.put(obj, this.uuid());
            }
          } else {
            cbWrapper(new Error('value to store that it doesn\'t have its own key and the ' +
              'autogenerated key was not enabled so it is required a wrapper'));
            return this;
          }

          resultObj.value = obj;
        }

        resultObj.addKey = true;
      }

      request.onsuccess = function (event) {
        cbWrapper(null, event);
      };
      request.onerror = function (event) {
        cbWrapper(event.target, null);
      };

      return this;
    },

    batch: function (colName, objs, callback) {

      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          self.batch(colName, objs, callback);
        });

        return this;
      }

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

      if (!this.objStoreIdx[colName]) {
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

      if (!this.ready) {
        this.waiting.push(function () {
          self.get(colName, keyOrArray, callback);
        });

        return this;
      }

      var request;
      var collection = this.objStoreIdx[colName];

      var cbWrapper = function (err, results) {
        // manually clean up event handlers on request; this helps on chrome
        // uncommend if it is needed
        //if (request) request.onupgradeneeded = request.onsuccess = request.error = null;

        if (callback) {
          self.lambda(callback)(err, results);
        }
      };

      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }


      if (!this.isArray(keyOrArray)) {
        request = this.db.transaction(colName).objectStore(colName).get(keyOrArray);

        request.onsuccess = function (event) {
          cbWrapper(null, event.target.result);
        };

        request.onerror = function (event) {
          //console.log("Failed to find " + keyOrArray);
          cbWrapper(event.target, null);
        };

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
        for (var i = 0, l = keys.length; i < l; i++)
          getOne(i);
      }

      return this;
    },

    exists: function (colName, key, callback) {

      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          this.exists(colName, key, callback);
        });

        return this;
      }

      var request;

      var cbWrapper = function (err, result) {
        // manually clean up event handlers on request; this helps on chrome
        // uncommend if it is needed
        //if (request) request.onupgradeneeded = request.onsuccess = request.error = null;

        if (callback) {
          self.lambda(callback)(err, result)
        }
      };


      if (!this.objStoreIdx[colName]) {
        cbWrapper(new Error('Incorrect collection name'));
      }

      request =
        this.db.transaction(colName).objectStore(colName).openCursor(getIDBKeyRange().only(key));

      request.onsuccess = function (event) {
        // exists iff request.result is not null
        // XXX but firefox returns undefined instead, sigh XXX
        cbWrapper(null, event.target.result !== null &&
          event.target.result !== undefined);
      };

      request.onerror = function (event) {
        //console.log("Failed to test for " + key);
        cbWrapper(event.target, null);
      };

      return this;
    },

    all: function (colName, callback) {

      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          self.all(colName, callback);
        });

        return this;
      }

      var request;
      var collection = this.objStoreIdx[colName];

      var cbWrapper = function (err, result) {
        // manually clean up event handlers on request; this helps on chrome
        // uncommend if it is needed
        //if (request) request.onupgradeneeded = request.onsuccess = request.error = null;

        if (callback) {
          self.lambda(callback)(err, result);
        }
      };


      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
      }

      var objectStore = this.db.transaction(colName).objectStore(colName);
      var toReturn = [];
      request = objectStore.openCursor();

      request.onsuccess = function (event) {
        var cursor = event.target.result;
        var item;
        if (cursor) {
          if (!collection.keyPath) {
            item = {};
            item[self.autoKeyPath] = cursor.key;
            item.value = cursor.value
          } else {
            item = cursor.value;
          }
          toReturn.push(item);
          cursor.continue();

        } else {
          cbWrapper(null, toReturn);
        }
      };

      request.onerror = function (event) {
        cbWrapper(event.target, null);
      };

      return this;
    },

    keys: function (colName, callback) {

      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          self.keys(colName, callback);
        });

        return this;
      }

      var request;

      var cbWrapper = function (err, result) {
        // manually clean up event handlers on request; this helps on chrome
        // uncommend if it is needed
        //if (request) request.onupgradeneeded = request.onsuccess = request.error = null;

        if (callback) {
          self.lambda(callback)(err, result);
        }
      };

      if (!this.objStoreIdx[colName]) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      var objectStore = this.db.transaction(colName).objectStore(colName);
      var toReturn = [];
      // in theory we could use openKeyCursor() here, but no one actually
      // supports it yet.
      request = objectStore.openCursor();

      request.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
          toReturn.push(cursor.key);
          cursor.continue();
        }
        else {
          cbWrapper(null, toReturn);
        }
      };

      request.onerror = function (event) {
        cbWrapper(event.target);
      };

      return this;
    },

    remove: function (colName, keyOrArray, callback) {

      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          self.remove(colName, keyOrArray, callback);
        });

        return this;
      }

      var request;
      var key;
      var collection = this.objStoreIdx[colName];

      var cbWrapper = function (err) {
        // manually clean up event handlers on request; this helps on chrome
        // uncommend if it is needed
        //if (request) request.onupgradeneeded = request.onsuccess = request.error = null;

        if (callback) {
          self.lambda(callback)(err);
        }
      };

      if (!collection) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }

      if (this.isArray(keyOrArray)) {
        // batch remove
        var i, done = keyOrArray.length;
        var errors = [];
        var numErrors = 0;

        var removeOne = function (i) {
          self.remove(colName, keyOrArray[i], function (err) {

            if (err) {
              numErrors++;
              errors[i] = err;
            } else {
              errors[i] = null;
            }

            if ((--done) > 0) { return; }
            if (callback) {
              if (numErrors > 0) {
                cbWrapper(errors);
              } else {
                cbWrapper(null);
              }

            }
          });
        };
        for (i = 0; i < keyOrArray.length; i++) {
          removeOne(i);
        }

      } else {

        if ('object' === typeof keyOrArray) {
          if (collection.keyPath) {
            key = keyOrArray[collection.keyPath];
          } else {
            key = keyOrArray[this.autoKeyPath];
          }
        } else {
          key = keyOrArray;
        }

        request = this.db.transaction(colName, READ_WRITE).objectStore(colName).delete(key);

        request.onsuccess = function (event) {
          cbWrapper();
        };
        request.onerror = function (event) {
          cbWrapper(event.target);
        };
      }

      return this;
    },

    nuke: function (colName, callback) {

      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          self.nuke(colName, callback);
        });

        return this;
      }

      var request;

      var cbWrapper = function (err) {
        // manually clean up event handlers on request; this helps on chrome
        // uncommend if it is needed
        //if (request) request.onupgradeneeded = request.onsuccess = request.error = null;

        if (callback) {
          self.lambda(callback)(err);
        }
      };

      if (!this.objStoreIdx[colName]) {
        cbWrapper(new Error('Incorrect collection name'));
        return this;
      }


      try {
        request = this.db.transaction(colName, READ_WRITE).objectStore(colName).clear();

        request.onsuccess = function () {
          cbWrapper();
        };

        request.onerror = function (event) {
          cbWrapper(event.target);
        };

      } catch (e) {
        cbWrapper(e);
      }
      return this;
    },

    nukeAll: function (callback) {

      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          self.nukeAll(callback);
        });

        return this;
      }

      var objStoreCounter = this.db.objectStoreNames.length;
      var errors = {};
      var numErrors = 0;
      var colName;
      var trans;
      var request;

      var cbWrapper = function (err) {
        if (callback) {
          self.lambda(callback)(err);
        }
      };


      var callCbIfFinished = function () {
        objStoreCounter--;

        if (objStoreCounter === 0) {
          if (numErrors > 0) {
            cbWrapper(errors);
          } else {
            cbWrapper(null);
          }
        }
      };

      trans = this.db.transaction(this.db.objectStoreNames, READ_WRITE);

      for (colName in this.objStoreIdx) {
        request = trans.objectStore(colName).clear();

        request.onsuccess = function (event) {
          callCbIfFinished();
        };

        request.onerror = function (event) {
          numErrors++;
          errors[colName] = event.target;
          callCbIfFinished();
        }
      }

      return this;
    },

    collectionNames: function (callback) {

      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          self.collectionNames(callback);
        });

        return this;
      }


      if (callback) {
        this.lambda(callback)(null, this.db.objectStoreNames);
      }

      return this;
    },

    getCollection: function (colName, callback) {

      var self = this;

      if (!this.ready) {
        this.waiting.push(function () {
          self.getCollection(colName, callback);
        });

        return this;
      }

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

  return IndexDB;

})());
