'use strict'


module('Lawnbench field-value to object plugin tests', {
  setup: function () {

  },
  teardown: function () {
  }
});

asyncTest('init and save test', function (lbInst) {

  QUnit.expect(13);

  new Lawnbench({dbName: 'lawnbench-fieldValueToObj', recreate: true, adapters: adapterId, collections:
    [
      {
        name: 'store1',
        keyPath: 'myId'
      },
      {
        name: 'store2',
        autoGenKey: true
      }
    ],
    plugins: {
      fieldValueToObject: {
        autoKeyPath: {
          memory: 'id',
          'indexed-db': 'id'
        },
        autoApply: true,
        collectionsObject: {
          memory: {
            objName: 'colStores',
            keyPathAttr: 'keyPath'
          },
          'indexed-db': {
            objName: 'objStoreIdx',
            keyPathAttr: 'keyPath'
          }
        }
      }
    }
  }, function (error, ref) {

    if (error) {
      ok(true, 'An error in the underlying store; launch the test again');
      QUnit.start();
      return;
    }

    ref.save('store1', {myId: 'kiwi', quantity: 3}, function (error, obj) {

      if (error) {
        ok(true, 'An error in the underlying store; launch the test again');
        QUnit.start();
        return;
      }

      deepEqual(obj, {myId: 'kiwi', quantity: 3}, 'object saved in store1 , returned the object ' +
        'to the callback');
    });

    ref.save('store2', {value: 'Wrapper without key'}, function (error, obj) {
      if (error) {
        ok(true, 'An error in the underlying store; launch the test again');
        QUnit.start();
        return;
      }

      for (var prop in obj) {
        equal(obj[prop], 'Wrapper without key', 'object saved in store4, returned'
          + 'using a wrapper without key return the right value');
      }

      var propToCheckInAll = prop;

      ref.batch('store2', [
        {
          id: 'string',
          value: 'a string'
        },
        {
          id: 'number',
          value: 1
        },
        {
          id: 'object',
          value: {name: 'test'}
        }
      ], function (error, obj) {

        if (error) {
          ok(true, 'An error in the underlying store; launch the test again');
          QUnit.start();
          return;
        }

        for (var prop in obj) {

          switch (prop) {
            case 'string':
              equal(obj[prop], 'a string',
                '\'string\' property exists and contains the expected value');
              break;
            case 'number':
              equal(obj[prop], 1, '\'number\' property exists and contains the expected value');
              break;
            case 'object':
              deepEqual(obj[prop], {name: 'test'},
                '\'object\' property exists and contains the expected value');
              break;
            default:
              ok(false, 'The returned object contains an unexpected property: ' + prop);
          }
        }

        ref.batch('store2',
          {
            objkey1: 1,
            objkey2: '2'
          }, function (error, obj) {

            if (error) {
              ok(true, 'An error in the underlying store; launch the test again');
              QUnit.start();
              return;
            }

            for (var prop in obj) {

              switch (prop) {
                case 'objkey1':
                  equal(obj[prop], 1,
                    '\'objkey1\' property exists and contains the expected value');
                  break;
                case 'objkey2':
                  equal(obj[prop], '2',
                    '\'objkey2\' property exists and contains the expected value');
                  break;
                default:
                  ok(false, 'The returned object contains an unexpected property: ' + prop);
              }
            }


            ref.all('store2', function (error, obj) {
              if (error) {
                ok(true, 'An error in the underlying store; launch the test again');
                QUnit.start();
                return;
              }

              for (var prop in obj) {

                switch (prop) {
                  case 'string':
                    equal(obj[prop], 'a string',
                      '\'string\' property exists and contains the expected value');
                    break;
                  case 'number':
                    equal(obj[prop], 1,
                      '\'number\' property exists and contains the expected value');
                    break;
                  case 'object':
                    deepEqual(obj[prop], {name: 'test'},
                      '\'object\' property exists and contains the expected value');
                    break;
                  case propToCheckInAll:
                    deepEqual(obj[prop], 'Wrapper without key',
                      '\'auto key\' property exists and contains the expected value');
                    break;
                  case 'objkey1':
                    equal(obj[prop], 1,
                      '\'objkey1\' property exists and contains the expected value');
                    break;
                  case 'objkey2':
                    equal(obj[prop], '2',
                      '\'objkey2\' property exists and contains the expected value');
                    break;
                  default:
                    ok(false, 'The returned object contains an unexpected property: ' + prop);
                }
              }

              QUnit.start();
            });
          });
      });
    });

  });


});