lawnbench
=============

Fork of Lawnchair-ncc project (A lightweight clientside JSON document store with "node callbacks convention") which allows to create several collections to store the different types of models used in your web application.


## Why this new fork?

After I decided to fork Lawnchair to create Lawnchair-ncc I realised that due one instance of Lawnchair only allows to create a one collection so if you web application have several different types of models then you have two options:

1. Store all your models in the same collection, so depending of the nature of your application you can get a mess if you want to get only some models of the same type, besides the possibility to get clashes between keys of different types of models.

2. Create one Lawnchair instance per collection, although some adapters cannot use the same database to store all the collections so each instance create a new database to store its collection (this case has been found in IndexedDB, because only it is possible create or destroy stores in one stage between the connection to the database is requested and it is opened read https://developer.mozilla.org/en-US/docs/IndexedDB/IDBDatabase)

## API

API of this library is quite similar to the Lawnbench and it may be the same. I needed to do some refactorings but I tried to keep as much as possible the code, bearing in mind "don't reinvent the wheel'", so please take a look to awesome documentation page of Lawnchair (http://brian.io/lawnchair/); for this reason there may be some code's styles, patterns, architecture or whatever related with the software development which aren't totally agree with my style and likes.


### Main differences

Lawnbench unlike Lawnchair, doesn't bound the callbacks function to the instance, so the external variable assigned in the parent scope (instance returned by the constructor) or in the case of the constructor's callback, the reference passed to the callback must be used to use it.

Moreover that all the callbacks follow the node-convention callback, remember Lawnbench is a fork of Lawnchair-ncc (https://github.com/ifraixedes/lawnchair-ncc).

#### Constructor

The constructor has two parameters:

The first, is required and it may be an object with some options or an array or a string with the name to the collections to manage in the store created or connect to this instance.

If options is an object, then it must have, at least, the 'collections' property which is the same type and values convention, that I mentioned in the above paragraph, as provided straight away as this constructor's parameter.

* collections: Array or string with the collections names of the store, managed for this instance. If it is a string then it must have the name of each collection separated by comma (,).
* [dbName]: The name of the database/store to use, by default 'lawnbench'.
* [adapters]: Array or string (if only one adapter is specified) with the id's (names) of the adapters to use in preference order.
* [plugins]: Object with the options for each used plugin. Each property defines the options to provide to the plugin's 'init' method, identified with the property's name, which is the proper plugin's 'id'.
* .... : The rest of the parameters, if they exist, will be used by the adapter's 'init' method.

An the second, the node-convention callback function which will be called when the store has been initialised or if an error happened. This is an optional parameter, but it is recommend to provide to know that the store is ready to use, and it is available to receive the read/write calls.

Lawnbench as Lawnchair mix the adapter interface with the instance create by this constructor, so one valid adapter is required. The adapter may be specified by 'adapters' options parameter, and each adapter may require some options parameter and/or may be available depending the browser and its release, so the constructor checks if the adapter is valid using its 'valid' method and if it fails, then check the next one of the list until arrive at the end, and if it doesn't find any valid adapter then throws and exception. Note that the 'adapters' options' parameter is optional, so if it is not provide, the constructor will use the first valid adapter of the list, whose order corresponds with the including order of the javascript plugin files.


#### Adapter's interface

Each Lawnbench's adapter requires the implementation of a base interface; more methods may be provided but it is discouraged because if only some methods are provided for some adapters, and your application set several adapters, then it will have to check their availability before calling or only use adapters which provide all those methods.

A Lawnbench's adapter must have the next interface:

* "class" method (non-prototyped method):
    * 'valid': This method will be called by Lawnbench's constructor, providing the adapter's parameter specified in options, if any, to check if the adapter is available to use.

* instance methods:
    * 'init', 'keys', 'save', 'batch', 'get', 'exists', 'all', 'remove' and 'nuke': This methods are the same as specified in Lanwchair, with the only mentioned difference at the beginning of this parent section (API) and in the following paragraph.
    * nukeAll: As 'nuke' method, but delete all the elements of all the collections.
    * collectionNames: Returns an array of strings with the name of the collections
    * getCollection: Returns an object which wrap the methods: 'keys', 'save', 'batch', 'get', 'exists', 'all', 'remove' and 'nuke' that only apply to the specified collection. The method receive the name of the collection as first parameter, the second is a callback function.

The instance inherited Lawnchair's methods differ from it in that they receive as a first parameter the collection name to perform the operation, so the object returned by getCollection wrap that methods to apply to the specified collection, so that object methods receive the same parameter except the first one (the collection's name).

The adapter should, although is not required, two types of collections, collection that store documents, which are basically object that has an attribute that is used as key and collections that store key-value pairs, more used for store primitive types; I was encouraged to think in these two types by the IndexedDB API specification.

However, due that Lawnbench manages different collections the implementation of the adapters may be more complex and require some options parameters to deal with the multi-collection nature.



#### Plugin's interface

The Lanwbench 'plugin' method, used to register plugins, differs that it receives as first parameter the id of the plugin. It is needed for the Lawnbench's constructor can identify the plugin to provide its options, if any and specified in the options object, to the 'init' call method.


### Current adapters and plugins

The current adapters available has been ported from Lawnchair, but they have been adapted to support the multi-collection nature.

In the present time are available two adapters:

* memory: The store is based in javascript variables, so all the store is volatile.
* IndexedDB: The store is based in IndexedDB client-side storage API (https://developer.mozilla.org/en-US/docs/IndexedDB)

And two plugins (non-ported from Lawnchair):

* promise: Use a provided promise implementation to convert all the methods to return a promise rather than the accept a callback function. The provided promise implementation has to implement a 'defer' method to get a deferred object which has to implement the methods 'promise', resolve and reject; this interface is a minimal interface inspired by Kris Kowal's Q (https://github.com/kriskowal/q)
* fieldValueToObject: Transform the behaviour of key-value collections' type. Applying the plugin, the result got from 'all' and 'get' method, there will be an object (properties names are the keys and their values the correspondent value) rather than an array of "wrapped" objects (object that has the key and the value in one attribute for each) and the parameters accepted by the 'save' and 'batch' will be objects (properties' name will be the key, and values the associated values) rather than a "wrapped" object ('save'') or array of them ('batch').


## Test

Some unit test has been provided to test the global aspects and specific aspects of adapters and plugins.

To execute the provided test you can execute, under test directory, the index-local.html from the file browser with any HTTP server, regarding that the browser security policies may avoid the script execution or running with node nodeApp.js visit the URL http://localhost:3000, remember run 'npm install' before running the node server.

## Future

So far, there are only two adapters implemented and two plugins. My aim is implementing new adapters and plugins when one of my projects or jobs require another adapter or some features which they can be implemented as a plugin.


## About its name

This library was named Lawnbench, because it allows to manage several collection unlike of Lawnchair, so if in a chair only can seat one person,in a bench can seat more than one.

## Acknowledges

I want to say many thanks to Brian LeRoux and Lawnchair contributors as well, to start and release under a Open Source License the Lanwchair project.
