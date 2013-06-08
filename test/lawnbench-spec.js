'use strict'


module('Lawnbench global tests', {
  setup: function () {
    //QUnit.stop();
  },
  teardown: function () {
  }
});

asyncTest('constructor requires some options', function () {
  //QUnit.stop();
  var colsInString = 'test,test2,test3,test4';
  var colsInArray = colsInString.split(',');
  QUnit.expect(7);

  // raise exception if no ctor callback is supplied
  try {
    var lc2 = new Lawnbench();
  } catch (e) {
    ok(true, 'exception raised no options supplied');
  }
  try {
    var lc3 = new Lawnbench({});
  } catch (e) {
    ok(true, 'exception raised if options object doesn\'t have the collections attribute');
  }
  try {
    var lc3 = new Lawnbench(10);
  } catch (e) {
    ok(true, 'exception raised if options is not an appropriated type');
  }

  var lc = new Lawnbench({collections: 'test', recreate: true, adapters: adapterId},
    function (error, ref) {

      lc = new Lawnbench({dbName: 'justOtherDb',
          collections: colsInString,
          recreate: true},
        function (error, ref) {
          ref.collectionNames(function (error, colList) {
            if (error) {
              ok(false, 'An error in the underlying store; launch the test again');
              QUnit.start();
              return;
            }

            equal(colsInArray.length, colList.length,
              'The collection list contains the same number '
                + 'of collections');

            var sameCols = true;
            for (var i = 0; i < colsInArray.length; i++) {
              if (ref.indexOf(colList, colsInArray[i]) < 0) {
                sameCols = false;
                break;
              }
            }

            ok(sameCols, 'The collection list contains the same collections name that there were ' +
              'specified');

            lc = new Lawnbench({dbName: 'justOtherDbFromColArray',
                collections: colsInArray,
                recreate: true},
              function (error, ref) {

                ref.collectionNames(function (error, colList) {
                  if (error) {
                    ok(false, 'An error in the underlying store; launch the test again');
                    QUnit.start();
                    return;
                  }

                  equal(colsInArray.length, colList.length,
                    'The collection list contains the same number '
                      + 'of collections');

                  var sameCols = true;
                  for (var i = 0; i < colsInArray.length; i++) {
                    if (ref.indexOf(colList, colsInArray[i]) < 0) {
                      sameCols = false;
                      break;
                    }
                  }

                  ok(sameCols,
                    'The collection list contains the same collections name that there were ' +
                      'specified');

                  QUnit.start();
                });
              });
          });
        });
    });
});

asyncTest('saving individual values in collections data stores', function () {

  module('Lawnbench global tests');
  QUnit.expect(12);

  new Lawnbench({dbName: 'lawnbench-test-battery', recreate: true, adapters: adapterId, collections:
    [
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
      ok(false, 'An error in the underlying store; launch the test again');
      QUnit.start();
      return;
    }

    ref.save('store1', {myId: 'kiwi', quantity: 3}, function (error, obj) {

      if (error) {
        ok(false, 'An error in the underlying store; launch the test again');
        QUnit.start();
        return;
      }

      deepEqual(obj, {myId: 'kiwi', quantity: 3}, 'object saved in store1 , returned the object ' +
        'to the callback');

      ref.save('store2', 'Antonio\'s Fruits', function (error, obj) {
        if (error) {
          ok(true, 'Error because store2 doesn\'t autogeneated key and it was not provided');
        } else {
          ok(false, 'An error should have happened');
        }

        ref.save('store2', {id: 'antonio', value: 'Antonio\'s Fruits'}, function (error, obj) {
          if (error) {
            ok(false, 'An error in the underlying store; launch the test again');
            QUnit.start();
            return;
          }

          equal(obj.id, 'antonio',
            'object saved in store2 , returned the object with the provided key');
          equal(obj.value, 'Antonio\'s Fruits',
            'object saved in store2 , returned the expected value');

          ref.save('store3', {key: 'myKey', desc: 'autokey but the value of the key is provided'},
            function (error, obj) {
              if (error) {
                ok(false, 'An error in the underlying store; launch the test again');
                QUnit.start();
                return;
              }

              deepEqual(obj, {key: 'myKey', desc: 'autokey but the value of the key is provided'},
                'object saved in store3 , returned the key and value to the callback');

              ref.save('store3', {
                  desc: 'autokey but the value of the key is NOT provided'},
                function (error, obj) {
                  if (error) {
                    ok(false, 'An error in the underlying store; launch the test again');
                    QUnit.start();
                    return;
                  }

                  equal(obj.desc, 'autokey but the value of the key is NOT provided',
                    'object saved in store3 , returned the key and value to the callback');


                  ref.save('store1', {myId: 'oranges', quantity: 1}, function (error, obj) {

                    if (error) {
                      ok(false, 'An error in the underlying store; launch the test again');
                      QUnit.start();
                      return;
                    }

                    deepEqual(obj, {myId: 'oranges', quantity: 1},
                      'object saved in store1 , returned the object to the callback');

                    ref.save('store1', {quantity: 1000}, function (error, obj) {

                      if (error) {
                        ok(true,
                          'Error because store1 doesn\'t autogeneated key and it was not provided');
                      } else {
                        ok(false, 'An error should have happened');
                      }

                      ref.save('store4', {value: 'Wrapper without key'}, function (error, obj) {
                        if (error) {
                          ok(false, 'An error in the underlying store; launch the test again');
                          QUnit.start();
                          return;
                        }

                        equal(obj.value, 'Wrapper without key', 'object saved in store4, returned '
                          + 'using a wrapper without key return the right value');

                        ref.save('store4', 10, function (error, obj) {
                          if (error) {
                            ok(false, 'An error in the underlying store; launch the test again');
                            QUnit.start();
                            return;
                          }

                          equal(obj.value, 10, 'object saved in store4 , returned the right value');

                          ref.save('store4', {id: 'justKey', value: 'wrapper with key'},
                            function (error, obj) {
                              if (error) {
                                ok(false, 'An error in the underlying store; launch the test again');
                                QUnit.start();
                                return;
                              }

                              equal(obj.id, 'justKey',
                                'object wrapper saved in store4 , returned the object with the ' +
                                  'provided key');
                              equal(obj.value, 'wrapper with key',
                                'object saved in store4 , ' + 'returned the right value');

                              QUnit.start();
                              launchTestRemoveValues(ref);
                            });
                        });
                      });
                    });
                  });
                });
            });
        });
      });
    });
  });
});

function launchTestRemoveValues(lawnbench) {

  module('Lawnbench global tests');
  asyncTest('empty all, but test remove, nuke and nukeAll', function () {
    QUnit.expect(8);


    lawnbench.nuke('store2', function (error) {
      if (error) {
        ok(false, 'An error in the underlying store; launch the test again, but it will happen ' +
          'again maybe there is something wrong');
        QUnit.start();
      }

      ok(true, 'Great! the store2 was empty');

      lawnbench.all('store2', function (error, results) {
        if (error) {
          ok(false,
            'An error in the underlying store; launch the test again, but it will happen ' +
              'again maybe there is something wrong');
          QUnit.start();
          return;
        }

        deepEqual(results, [], 'So store1 returns no elements');

        lawnbench.remove('store1', ['kiwi', 'oranges'], function (error) {

          if (error) {
            ok(false,
              'An error in the underlying store; launch the test again, but it will happen ' +
                'again maybe there is something wrong');
            QUnit.start();
            return;
          }

          lawnbench.all('store1', function (error, results) {

            if (false) {
              ok(true,
                'An error in the underlying store; launch the test again, but it will happen ' +
                  'again maybe there is something wrong');
              QUnit.start();
              return;
            }

            if (!lawnbench.isArray(results)) {
              ok(false, 'results should be an array')
            } else {
              equal(results.length, 0, 'store1 has no elements')
            }

            lawnbench.remove('store3', 'myKey', function (error) {

              if (error) {
                ok(false,
                  'An error in the underlying store; launch the test again, but it will happen ' +
                    'again maybe there is something wrong');
                QUnit.start();
                return;
              }

              lawnbench.all('store3', function (error, results) {

                if (error) {
                  ok(false,
                    'An error in the underlying store; launch the test again, but it will happen ' +
                      'again maybe there is something wrong');
                  QUnit.start();
                  return;
                }

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

                lawnbench.nukeAll(function (error) {
                  if (error) {
                    ok(false, 'An error in the underlying store; launch the test again, but it ' +
                      'will happen again maybe there is something wrong');
                    QUnit.start();
                    return;
                  }

                  lawnbench.all('store1', function (error, results) {
                    if (error) {
                      ok(false, 'An error in the underlying store; launch the test again, but it ' +
                        'will happen again maybe there is something wrong');
                      QUnit.start();
                      return;
                    }

                    if (!lawnbench.isArray(results)) {
                      ok(false, 'results should be an array')
                    } else {
                      equal(results.length, 0, 'no result into the array')
                    }

                    lawnbench.all('store2', function (error, results) {
                      if (error) {
                        ok(false, 'An error in the underlying store; launch the test again, but ' +
                          'it will happen again maybe there is something wrong');
                        QUnit.start();
                        return;
                      }

                      if (!lawnbench.isArray(results)) {
                        ok(false, 'results should be an array')
                      } else {
                        equal(results.length, 0, 'no result into the array')
                      }

                      lawnbench.all('store3', function (error, results) {
                        if (error) {
                          ok(false, 'An error in the underlying store; launch the test again, ' +
                            'but it will happen again maybe there is something wrong');
                          QUnit.start();
                          return;
                        }

                        if (!lawnbench.isArray(results)) {
                          ok(false, 'results should be an array')
                        } else {
                          equal(results.length, 0, 'no result into the array')
                        }

                        lawnbench.all('store4', function (error, results) {
                          if (error) {
                            ok(false, 'An error in the underlying store; launch the test again, ' +
                              'but it will happen again maybe there is something wrong');
                            QUnit.start();
                            return;
                          }

                          if (!lawnbench.isArray(results)) {
                            ok(false, 'results should be an array')
                          } else {
                            equal(results.length, 0, 'no result into the array')
                          }

                          QUnit.start();
                          launchSaveValuesInBatch(lawnbench);
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

function launchSaveValuesInBatch(lawnbench) {

  module('Lawnbench global tests');
  asyncTest('saving values in collections data stores in batch', function () {

    QUnit.expect(10);

    lawnbench.batch('store1', [
      {myId: 'kiwi', quantity: 3},
      {myId: 'oranges', quantity: 1}
    ], function (error, objs) {

      if (error) {
        ok(false, 'An error in the underlying store; launch the test again');
        QUnit.start();
        return;
      }

      deepEqual(objs, [
        {myId: 'kiwi', quantity: 3},
        {myId: 'oranges', quantity: 1}
      ],
        'object saved in store1 , returned the same objects to the callback');

      lawnbench.batch('store2', [
        {id: 'antonio', value: 'Antonio\'s Fruits'},
        'No key'
      ], function (error, objs) {
        if (error) {
          ok(true, 'Error because store2 doesn\'t autogeneated key for one element');
        } else {
          ok(false, 'An error should have happened');
        }

        if (!lawnbench.isArray(objs)) {
          ok(false, 'objs should be an array')
        } else {
          if (objs.length !== 2) {
            ok(false, 'objs array will have two elements')
          } else {
            ok((objs[0].id === 'antonio') && (objs[0].value === 'Antonio\'s Fruits'),
              'first object return was the expected');
            equal(objs[1], null, 'first object return was the expected');
          }
        }

        lawnbench.batch('store3', [
          {key: 'myKey', desc: 'autokey but the value of the key is provided'},
          {desc: 'autokey but the value of the key is NOT provided'}
        ],
          function (error, objs) {
            if (error) {
              ok(false, 'An error in the underlying store; launch the test again');
              QUnit.start();
              return;
            }

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

            lawnbench.batch('store4', [
              {value: 'Wrapper without key'},
              10,
              {id: 'justKey', value: 'wrapper with key'}
            ], function (error, objs) {
              if (error) {
                ok(false, 'An error in the underlying store; launch the test again');
                QUnit.start();
                return;
              }


              if (!lawnbench.isArray(objs)) {
                ok(false, 'objs should be an array')
              } else {
                if (objs.length !== 3) {
                  ok(false, 'objs array should have 3 elements')
                } else {
                  equal(objs[0].value, 'Wrapper without key', 'object saved in store4, returned '
                    + 'using a wrapper without key return the right value');

                  equal(objs[1].value, 10, 'object saved in store4 , returned the right value');

                  equal(objs[2].id, 'justKey',
                    'object wrapper saved in store4 , returned the object with the ' +
                      'provided key');
                  equal(objs[2].value, 'wrapper with key',
                    'object saved in store4 , ' + 'returned the right value');

                }
              }
              QUnit.start();
              launchTestGetValues(lawnbench, objs[2].id, objs[2].value);
            });
          });
      });
    });
  });
}

function launchTestGetValues(lawnbench, store4AutoKey, store4AutoValue) {

  module('Lawnbench global tests');
  asyncTest('get the values from the stores', function () {
    QUnit.expect(11);

    lawnbench.all('store1', function (error, results) {
      if (error) {
        ok(false, 'An error in the underlying store; launch the test again, but it will happen ' +
          'again maybe there is something wrong');
        QUnit.start();
        return;
      }

      if (!lawnbench.isArray(results)) {
        ok(false, 'results should be an array')
      } else {
        if (results.length !== 2) {
          ok(false, 'results array should have 2 elements')
        } else {
          ok(results[0].myId === 'kiwi' || results[0].myId === 'oranges',
            'got one expected key from store1');
          ok(results[0].quantity === 3 || results[0].quantity === 1,
            'got one expected value from store1');
          ok(results[1].myId === 'kiwi' || results[1].myId === 'oranges',
            'got one expected key from store1');
          ok(results[1].quantity === 3 || results[1].quantity === 1,
            'got one expected value from store1');
        }
      }

      lawnbench.get('store1', ['kiwi', 'oranges'], function (error, results) {
        if (error) {
          ok(false, 'An error in the underlying store; launch the test again, but it will happen ' +
            'again maybe there is something wrong');
          QUnit.start();
          return;
        }

        if (!lawnbench.isArray(results)) {
          ok(false, 'results should be an array')
        } else {
          if (results.length !== 2) {
            ok(false, 'results array should have 2 elements')
          } else {
            ok(results[0].myId === 'kiwi' || results[0].myId === 'oranges',
              'got one expected key from store1');
            ok(results[0].quantity === 3 || results[0].quantity === 1,
              'got one expected value from store1');
            ok(results[1].myId === 'kiwi' || results[1].myId === 'oranges',
              'got one expected key from store1');
            ok(results[1].quantity === 3 || results[1].quantity === 1,
              'got one expected value from store1');
          }
        }

        lawnbench.get('store3', 'myKey', function (error, result) {
          if (error) {
            ok(false, 'An error in the underlying store; launch the test again, but it will ' +
              'happen again maybe there is something wrong');
            QUnit.start();
            return;
          }

          deepEqual(result,
            { key: 'myKey', desc: 'autokey but the value of the key is provided'},
            'Great! we got all the object from the store3');

          lawnbench.get('store4', store4AutoKey, function (error, result) {
            if (error) {
              ok(false, 'An error in the underlying store; launch the test again, but it will ' +
                'happen again maybe there is something wrong');
              QUnit.start();
              return;
            }

            equal(result, store4AutoValue, 'Great! we got the value from the store4 ');

            lawnbench.all('store2', function (error, results) {
              if (error) {
                ok(false, 'An error in the underlying store; launch the test again, but it will ' +
                  'happen again maybe there is something wrong');
                QUnit.start();
                return;
              }


              if (!lawnbench.isArray(results)) {
                ok(false, 'results should be an array')
              } else {
                if (results.length !== 1) {
                  ok(false, 'results array will have one elements')
                } else {
                  ok(results[0].id === 'antonio' && results[0].value === 'Antonio\'s Fruits',
                    'got one expected key from store2');
                }
              }

              QUnit.start();

              launchTestExist(lawnbench);
            });
          });
        });
      });
    });
  });
}

function launchTestExist(lawnbench) {


  module('Lawnbench global tests');
  asyncTest('empty all, but test nuke of one store and after nukeAll to the others', function () {
    QUnit.expect(3);

    lawnbench.exists('store1', 'kiwi', function (error, check) {
      if (error) {
        ok(false, 'An error in the underlying store; launch the test again');
        QUnit.start();
        return;
      }

      ok(check, 'store1 contains an object with the key kiwi');

      lawnbench.exists('store2', 'antonio', function (error, check) {
        if (error) {
          ok(false, 'An error in the underlying store; launch the test again');
          QUnit.start();
          return;
        }

        ok(check, 'store2 contains a value with the key antonio');

        lawnbench.exists('store3', 'it does not exist', function (error, check) {
          if (error) {
            ok(false, 'An error in the underlying store; launch the test again');
            QUnit.start();
            return;
          }

          ok(!check, 'store3 doesn\'t contain an object with the key "it does not exist"');
          QUnit.start();

          launchTestKeys(lawnbench);
        });
      });
    });
  });
}


function launchTestKeys(lawnbench) {

  module('Lawnbench global tests');
  asyncTest('get the keys from stores', function () {
    QUnit.expect(3);

    lawnbench.keys('store1', function (error, keys) {
      if (error) {
        ok(false, 'An error in the underlying store; launch the test again');
        QUnit.start();
        return;
      }


      if (!lawnbench.isArray(keys)) {
        ok(false, 'keys should be an array')
      } else {
        if (keys.length !== 2) {
          ok(false, 'keys array should have 2 elements')
        } else {
          ok(keys[0] === 'kiwi' || keys[0] === 'oranges', 'got one expected key from store1');
          ok(keys[1] === 'kiwi' || keys[1] === 'oranges', 'got other expected keys from store1');
        }
      }


      lawnbench.keys('store2', function (error, keys) {
        if (error) {
          ok(false, 'An error in the underlying store; launch the test again');
          QUnit.start();
          return;
        }

        if (!lawnbench.isArray(keys)) {
          ok(false, 'keys should be an array')
        } else {
          if (keys.length !== 1) {
            ok(false, 'keys array should have 1 elements')
          } else {
            equal(keys[0], 'antonio', 'got one expected key from store2');
          }
        }

        QUnit.start();
        launchSimpleTestFromCollection(lawnbench);
      });
    });
  });
}

function launchSimpleTestFromCollection(lawnbench) {

  module('Lawnbench global tests');
  asyncTest('test store1 lawnbench collection', function () {
    QUnit.expect(3);

    lawnbench.getCollection('store1', function (error, storeCol) {

      if (error) {
        ok(false, 'An error in the underlying store; launch the test again');
        QUnit.start();
        return;
      }

      storeCol.keys(function (error, keys) {
        if (error) {
          ok(false, 'An error in the underlying store; launch the test again');
          QUnit.start();
          return;
        }


        if (!lawnbench.isArray(keys)) {
          ok(false, 'keys should be an array')
        } else {
          if (keys.length !== 2) {
            ok(false, 'keys array should have 2 elements')
          } else {
            ok(keys[0] === 'kiwi' || keys[0] === 'oranges', 'got one expected key from store1');
            ok(keys[1] === 'kiwi' || keys[1] === 'oranges', 'got other expected keys from store1');
          }
        }

        storeCol.get('kiwi', function (error, result) {
          if (error) {
            ok(false, 'An error in the underlying store; launch the test again');
            QUnit.start();
            return;
          }

          deepEqual(result, {myId: 'kiwi', quantity: 3},
            'object saved in store1 , returned the object ' +
              'to the callback');

          QUnit.start();
        });
      });
    });
  });
}



