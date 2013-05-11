'use strict'


module('Lawnchair memory adatper tests', {
  setup: function () {

  },
  teardown: function () {
  }
});

test('Memory db external reference', function () {
  if (adapterId.toLowerCase() !== 'memory') {
    QUnit.expect(0);
    return;
  }

  QUnit.expect(18);

  var myDb = {
    store1: {
      kiwi: {
        myId: 'kiwi',
        quantity: 3
      }
    },
    store4: {
      str: 'Just an string',
      int: 1,
      float: 5.3
    }
  }

  new Lawnbench({
    dbName: 'lawnbench',
    recreate: true,
    adapters: adapterId,
    db: myDb,
    freezeObjects: true,
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
    ]}, function (error, ref) {

    if (error) {
      ok(true, 'An error in the underlying store; launch the test again');
      QUnit.start();
      return;
    }

    ref.get('store1', 'kiwi', function (error, obj) {

      if (error) {
        ok(false, 'No error shouldn\'t happen here');
      }

      equal(myDb.store1[obj.myId], obj,
        'The got from the DB is the same if we access using our external reference');

      ref.save('store1', {myId: 'oranges', quantity: 1}, function (error, obj) {

        if (error) {
          ok(false, 'No error shouldn\'t happen here');
        }

        equal(myDb.store1[obj.myId], obj,
          'object saved in store1 , is the same that the object accessed from our external db reference');


        ref.save('store2', {id: 'antonio', value: 'Antonio\'s Fruits'}, function (error, obj) {
          if (error) {
            ok(false, 'No error shouldn\'t happen here');
          }

          equal(myDb.store2[obj.id], 'Antonio\'s Fruits',
            'value saved in store2 , appear in our external db reference');

          ref.save('store3', {key: 'myKey', desc: 'autokey but the value of the key is provided'},
            function (error, obj) {
              if (error) {
                ok(false, 'No error shouldn\'t happen here');
              }

              equal(myDb.store3[obj.key], obj,
                'object saved in store3 , returned the key and value to the callback');

              ref.save('store3', {
                  desc: 'autokey but the value of the key is NOT provided'},
                function (error, obj) {
                  if (error) {
                    ok(false, 'No error shouldn\'t happen here');
                  }

                  equal(myDb.store3[obj.key], obj,
                    'object saved in store3 , returned the key and value to the callback');


                  ref.save('store4', {value: 'Wrapper without key'}, function (error, obj) {
                    if (error) {
                      ok(false, 'No error shouldn\'t happen here');
                    }

                    equal(myDb.store4[obj.id], obj.value,
                      'value saved in store4 , appear in our external db reference');

                    ref.save('store4', 10, function (error, obj) {
                      if (error) {
                        ok(false, 'No error shouldn\'t happen here');
                      }

                      equal(myDb.store4[obj.id], obj.value,
                        'value saved in store4 , appear in our external db reference');

                      ref.all('store4', function (error, results) {
                        if (error) {
                          ok(false, 'No error shouldn\'t happen here');
                        }


                        if (!Lawnbench.prototype.isArray(results)) {
                          ok(false, 'results should be an array')
                        } else {
                          if (results.length !== 5) {
                            ok(false, 'results array should have 4 elements')
                          } else {
                            var i;
                            for (i = 0; i < results.length; i++) {
                              equal(myDb.store4[results[i].id], results[i].value,
                                'value in store4 is accessible from the external database');
                            }
                          }
                        }


                        if (Object.freeze) {
                          throws(function () {
                              var obj = myDb.store1['kiwi'];

                              obj.quantity = 15;

                            }, TypeError,
                            'The object was frozen and "use strict" is enable so TypeError was thrown');
                        } else {
                          ok(true, 'ECMAScript 5 is not supported so objects are not frozen');
                        }

                        // Test if extDb don't modify the stores of the internal Db
                        delete myDb.store1;
                        myDb.store3['new element'] = {key: 'new element', desc: 'added externally'};


                        // empty the collection store4 from the external db
                        for (var k in myDb.store4) {
                          delete myDb.store4[k];
                        }

                        ref.all('store1', function (error, results) {

                            if (error) {
                              ok(false, 'No error shouldn\'t happen here');
                            }

                            if (!Lawnbench.prototype.isArray(results)) {
                              ok(false, 'results should be an array')
                            } else {
                              if (results.length !== 2) {
                                ok(false, 'results array should have 2 elements')
                              } else {
                                ok(true, 'internal db keep its integrity in the store1');
                              }
                            }

                            ref.all('store3', function (error, results) {

                              if (error) {
                                ok(false, 'No error shouldn\'t happen here');
                              }

                              if (!Lawnbench.prototype.isArray(results)) {
                                ok(false, 'results should be an array')
                              } else {
                                if (results.length !== 2) {
                                  ok(false, 'results array should have 2 elements')
                                } else {
                                  ok(true, 'internal db keep its integrity in the store3');
                                }
                              }

                              ref.all('store4', function (error, results) {
                                if (error) {
                                  ok(false, 'No error shouldn\'t happen here');
                                }


                                if (!Lawnbench.prototype.isArray(results)) {
                                  ok(false, 'results should be an array')
                                } else {
                                  if (results.length !== 5) {
                                    ok(false, 'results array should have 4 elements')
                                  } else {
                                    ok(true, 'internal db keep its integrity in the store4');
                                  }
                                }

                                ref.save('store4', {id: 'bigNum', value: 100000000},
                                  function (error, obj) {

                                    if (error) {
                                      ok(false, 'No error shouldn\'t happen here');
                                    }

                                    equal(obj.value, myDb.store4[obj.id],
                                      'object saved in store4 , is the same that the object ' +
                                        'accessed from our external db reference');
                                    ok(true, 'internal db keep its integrity to save new objects, ' +
                                    'when the the store4 was deleted from the external db');
                                  });

                              });
                            });
                          }
                        );
                      });
                    });
                  });
                });
            });
        });
      });
    });
  });
})
;
