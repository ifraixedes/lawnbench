'use strict'

/**
 * Lawnbench
 * ---
 * clientside json multi collection store
 *
 * ---
 * The implementation of this library has been strongly inspired from Lawnchair project.
 * See LICENSE file
 *
 *
 */
var Lawnbench = function (options, callback) {

  var i;
  var adapter;
  var adapterOptions;

  // ensure Lawnbench was called as a constructor
  if (!(this instanceof Lawnbench)) return new Lawnbench(options, callback);

  // Lawnbench requires json
  if (!JSON) throw 'JSON unavailable! Include http://www.json.org/json2.js to fix.'

  try {
    // options are required; callback is optional
    if (arguments.length < 1) {
      throw new Error('Constructor require options argument');
    }

    if ((callback) && ('function' !== typeof callback)) {
      throw new Error('callback must be a function');
    }


    var collections;

    if ('object' === typeof options) {
      if (options === null) {
        throw new Error('options argument must not be null');
      }

      if (!options.collections) {
        throw new Error('options argument is an object which doesn\'t have the collections property');
      }

      collections = options.collections;
      // Make a copy of the options object, to avoid modify it, to provided to the underlying
      // adapters valid method with the collections parsed to an array that how the adapter expects
      // its definition
      adapterOptions = JSON.parse(JSON.stringify(options));

    } else {
      collections = options;
      adapterOptions = {};
    }


    if (this.isArray(collections)) {
      this.collections = collections;
    } else if ('string' === typeof collections) {
      this.collections = collections.split(',');
    } else {
      throw new Error('options argument is unaccepted type, it must only be an object, array or string');
    }

  } catch (err) {
    throw new Error('Incorrect constructor arguments!. ' + err.message);
  }


  this.dbName = (options.dbName) ? options.dbName : 'lanwbench'; // default name for underlying database
  adapterOptions.collections = this.collections;

  // if the adapters is passed in we try to load the first that match with the available adapters
  if (options.adapters) {
    if (this.isArray(options.adapters)) {
      for (i = 0; i < options.adapters.length; i++) {
        if (Lawnbench.adapters[options.adapters[i]]) {
          if (Lawnbench.adapters[options.adapters[i]].valid(adapterOptions)) {
            this.adapter = Lawnbench.adapters[options.adapters[i]].adapter;
            adapter = new Lawnbench.adapters[options.adapters[i]]();
            break;
          }
        }
      }
    } else {
      // If only one adapter is specified then the option can be a string
      if (Lawnbench.adapters[options.adapters]) {
        if (Lawnbench.adapters[options.adapters].valid(adapterOptions)) {
          this.adapter = Lawnbench.adapters[options.adapters].adapter;
          adapter = new Lawnbench.adapters[options.adapters]();
        }
      }
    }
  }

  // otherwise find the first valid adapter for this env
  if (adapter === undefined) {
    for (i = 0; i < Lawnbench.adaptersList.length; i++) {
      if (Lawnbench.adaptersList[i].valid(adapterOptions)) {
        this.adapter = Lawnbench.adaptersList[i].adapter;
        adapter = new Lawnbench.adaptersList[i]();
        break;
      }
    }
  }

  // we have failed
  if (!adapter) throw new Error('Any available adapter is valid');

  // yay! mixin the adapter
  for (var j in adapter) {
    this[j] = adapter[j];
  }

  var pluginOptions = ((options.plugins) && ('object' === typeof options.plugins)) ?
    options.plugins : {};
  //var pluginInst;

  // call init for each mixed in plugin if its enabled
  for (i = 0; i < Lawnbench.plugins.length; i++) {
    if (pluginOptions.hasOwnProperty(Lawnbench.plugins[i].plugin)) {
      Lawnbench.plugins[i].init.call(this, pluginOptions[Lawnbench.plugins[i].plugin]);
    }
  }

  // init the adapter
  this.init(options, callback)
}

Lawnbench.adapters = {};
Lawnbench.adaptersList = [];

/**
 * queues an adapter for mixin
 * ===
 * - ensures an adapter conforms to a specific interface
 *
 */
Lawnbench.adapter = function (id, adapterClass) {
  // add the adapter id to the adapter obj
  // methods required to implement a lawnbench adapter
  adapterClass['adapter'] = id;

  var classMethods = [
    'valid'
  ];

  var instanceMethods = [
    'init',
    'keys',
    'save',
    'batch',
    'get',
    'exists',
    'all',
    'remove',
    'nuke',
    'nukeAll',
    'collectionNames',
    'getCollection'
  ];


  for (var i = 0; i < classMethods.length; i++) {
    if (!adapterClass[classMethods[i]]) {
      throw new Error('Invalid adapter! it does\'t define the class method: ' + classMethods[i]);
    }
  }

  for (var i = 0; i < instanceMethods.length; i++) {
    if (!adapterClass.prototype[instanceMethods[i]]) {
      throw new Error('Invalid adapter! it does\'t define the instance method: ' +
        instanceMethods[i]);
    }
  }
  // if we made it this far the adapter interface is valid push the adapter to the tail of preferred
  // adapters list
  Lawnbench.adaptersList.push(adapterClass);
  Lawnbench.adapters[id] = adapterClass;
}

Lawnbench.plugins = [];

/**
 * generic shallow extension for plugins
 * ===
 * - if an init method is found it registers it to be called when the lawnchair is inited
 * - yes we could use hasOwnProp but nobody here is an asshole
 */
Lawnbench.plugin = function (id, obj) {

  for (var i in obj) {
    if (i === 'init') {
      Lawnbench.plugins.push(obj);
    } else {
      this.prototype[i] = obj[i];
    }
  }

  obj['plugin'] = id;
}

/**
 * helpers
 *
 */
Lawnbench.prototype = {

  isArray: Array.isArray ||
    function (o) {
      return Object.prototype.toString.call(o) === '[object Array]'
    },

  /**
   * this code exists for ie8... for more background see:
   * http://www.flickr.com/photos/westcoastlogic/5955365742/in/photostream
   */
  indexOf: function (ary, item, i, l) {
    if (ary.indexOf) {
      return ary.indexOf(item);
    }

    for (i = 0, l = ary.length; i < l; i++) if (ary[i] === item) {
      return i;
    }

    return -1;
  },

  // awesome shorthand callbacks as strings. this is shameless theft from dojo.
  lambda: function (callback) {
    return this.fn('element', callback)
  },

  // first stab at named parameters for terse callbacks; dojo: first != best // ;D
  fn: function (name, callback) {
    return typeof callback == 'string' ? new Function('err', name, callback) : callback
  },

  // returns a unique identifier (by way of Backbone.localStorage.js)
  // TODO investigate smaller UUIDs to cut on storage cost
  uuid: function () {
    var S4 = function () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
  }

};
