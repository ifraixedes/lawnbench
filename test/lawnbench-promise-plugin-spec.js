'use strict'


module('Lawnbench promise plugin tests', {
  setup: function () {
    //QUnit.stop();
  },
  teardown: function () {
  }
});

asyncTest('init test', function (lbInst) {

  QUnit.expect(1);

  var lawnbench = new Lawnbench({
    dbName: 'lawnbench-promise',
    recreate: true,
    adapters: adapterId,
    collections: [
      {
        name: 'store1',
        keyPath: 'myId'
      },
      {
        name: 'store2'
      },
      {
        name: 'store3',
        keyPath: 'key',
        autoGenKey: true
      },
      {
        name: 'store4',
        autoGenKey: true
      }
    ],
    plugins: {
      promise: Q
    }
  });

  var promise = lawnbench.init();

  promise.then(function (lbInst) {
    ok(true, 'Promise works on init');
    testCollectionNames(lbInst);
    QUnit.start();

  }, function (err) {
    ok(false, 'it shouldn\'t happen, internal adapter error try to run the test again');
    QUnit.start();
  });

});

function testCollectionNames(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('collectionNames test', function () {

    QUnit.expect(3);

    var promise = lawnbench.collectionNames();

    promise.then(function (colList) {
      ok(true, 'Promise works on collectionNames');
      equal(colList.length, 4, 'The collection list contains the same number of collections');

      var sameCols = true;
      for (var i = 1; i < 4; i++) {
        if (lawnbench.indexOf(colList, 'store' + i) < 0) {
          sameCols = false;
          break;
        }
      }

      ok(sameCols, 'collectionNames works');
      testSave(lawnbench);
      QUnit.start();

    }, function (error) {
      ok(true, 'An error in the underlying store; launch the test again');
      QUnit.start();
    });
  });
}

function testSave(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('save test', function (lbInst) {

    QUnit.expect(2);

    var promise = lawnbench.save('store1', {myId: 'kiwi', quantity: 3});

    promise.then(function (obj) {
      ok(true, 'Promise works on save');

      deepEqual(obj, {myId: 'kiwi', quantity: 3}, 'object saved in store1 , returned the object ' +
        'to the callback');

      testBatch(lawnbench);
      QUnit.start();

    }, function (err) {
      ok(false, 'it shouldn\'t happen, internal adapter error try to run the test again');
      QUnit.start();
    });
  });
}

function testBatch(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('batch test', function () {

    QUnit.expect(3);

    var promise = lawnbench.batch('store3', [
      {key: 'myKey', desc: 'autokey but the value of the key is provided'},
      {desc: 'autokey but the value of the key is NOT provided'}
    ]);

    promise.then(function (objs) {
      ok(true, 'Promise works on batch');

      if (!lawnbench.isArray(objs)) {
        ok(false, 'objs should be an array')
      } else {
        if (objs.length !== 2) {
          ok(false, 'objs array will have two elements')
        } else {
          deepEqual(objs[0],
            {key: 'myKey', desc: 'autokey but the value of the key is provided'},
            'first object saved in store3 , returned the key and value to the callback');
          equal(objs[1].desc, 'autokey but the value of the key is NOT provided',
            'second bject saved in store3 , returned the key and value to the callback')
        }
      }

      testKeys(lawnbench);
      QUnit.start();

    }, function (err) {
      ok(false, 'it shouldn\'t happen, internal adapter error try to run the test again');
      QUnit.start();

    });

  });
}

function testKeys(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('keys test', function () {
    QUnit.expect(2);

    var promise = lawnbench.keys('store1');

    promise.then(function (keys) {
      ok(true, 'Promise works on all');

      if (!lawnbench.isArray(keys)) {
        ok(false, 'objs should be an array')
      } else {
        if (keys.length !== 1) {
          ok(false, 'keys array should have one element');
        } else {
          equal(keys[0], 'kiwi', 'keys works, we have got the only key');
        }
      }

      testRemove(lawnbench);
      QUnit.start();

    }, function (error) {
      ok(true,
        'An error in the underlying store; launch the test again, but it will happen ' +
          'again maybe there is something wrong');
      QUnit.start();
    });
  });
}


function testRemove(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('remove', function () {

    QUnit.expect(1);

    var promise = lawnbench.remove('store3', 'myKey');

    promise.then(function () {
      ok(true, 'Promise works on remove');

      testAll(lawnbench);
      QUnit.start();

    }, function (err) {
      ok(true,
        'An error in the underlying store; launch the test again, but it will happen ' +
          'again maybe there is something wrong');
      QUnit.start();
    });
  });
}

function testAll(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('all test', function () {
    QUnit.expect(2);

    var promise = lawnbench.all('store3');

    promise.then(function (results) {
      ok(true, 'Promise works on all');

      if (!lawnbench.isArray(results)) {
        ok(false, 'results should be an array')
      } else {
        if (results.length !== 1) {
          ok(false, 'results array will have one elements')
        } else {
          equal(results[0].desc,
            'autokey but the value of the key is NOT provided',
            'the only one object in store1 is the expected object');
        }
      }

      testGet(lawnbench);
      QUnit.start();

    }, function (error) {
      ok(true,
        'An error in the underlying store; launch the test again, but it will happen ' +
          'again maybe there is something wrong');
      QUnit.start();
    });
  });
}

function testGet(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('get test', function () {
    QUnit.expect(2);

    var promise = lawnbench.get('store1', 'kiwi');

    promise.then(function (result) {
      ok(true, 'Promise works on get');
      equal(result.quantity, 3,
        'autokey but the value of the key is NOT provided',
        'the only one object in store1 is the expected object');


      testExists(lawnbench);
      QUnit.start();

    }, function (error) {
      ok(true,
        'An error in the underlying store; launch the test again, but it will happen ' +
          'again maybe there is something wrong');
      QUnit.start();
    });
  });
}

function testExists(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('exists test', function () {
    QUnit.expect(2);

    var promise = lawnbench.exists('store1', 'strawberry');

    promise.then(function (result) {
      ok(true, 'Promise works on all');
      ok(!result, 'Exists works if it assert is true');

      testNuke(lawnbench);
      QUnit.start();

    }, function (error) {
      ok(true,
        'An error in the underlying store; launch the test again, but it will happen ' +
          'again maybe there is something wrong');
      QUnit.start();
    });
  });
}


function testNuke(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('nuke test', function () {
    QUnit.expect(2);

    var promise = lawnbench.nuke('store3');

    promise.then(function () {
      ok(true, 'Promise works on nuke');

      var promise = lawnbench.all('store3');

      promise.then(function (results) {
        if (results.length !== 0) {
          ok(false, 'results array will have no elements')
        } else {
          ok(true, 'Nuke works')
        }

        testGetCollection(lawnbench);
        QUnit.start();

      }, function (error) {
        ok(true,
          'An error in the underlying store; launch the test again, but it will happen ' +
            'again maybe there is something wrong');
        QUnit.start();
      });
    });
  });
}

function testGetCollection(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('getCollection test', function () {
    QUnit.expect(3);

    var promise = lawnbench.getCollection('store3');

    promise.then(function (colStore3) {
      ok(true, 'Promise works on getCollection');

      var promise = colStore3.all();

      promise.then(function (results) {
        if (results.length !== 0) {
          ok(false, 'results array will have no elements')
        } else {
          ok(true, 'Confirm that nuke totally works');
          ok(true, 'getCollection works');
        }

        testNukeAll(lawnbench);
        QUnit.start();

      }, function (error) {
        ok(true,
          'An error in the underlying store; launch the test again, but it will happen ' +
            'again maybe there is something wrong');
        QUnit.start();
      });
    });
  });
}


function testNukeAll(lawnbench) {

  module('Lawnbench promise plugin tests');
  asyncTest('nukeAll test', function () {

    var promise = lawnbench.nukeAll();

    promise.then(function () {
      ok(true, 'Promise works on nukeAll');

      var promise = lawnbench.all('store1');

      promise.then(function (results) {
        if (results.length !== 0) {
          ok(false, 'results array will have no elements')
        } else {
          ok(true, 'NukeAll works');
        }

        QUnit.start();
      }, function (error) {
        ok(true,
          'An error in the underlying store; launch the test again, but it will happen ' +
            'again maybe there is something wrong');
        QUnit.start();
      });
    });
  });
}