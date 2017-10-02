import { QueryManager, } from '../src/core/QueryManager';
import mockQueryManager from './mocks/mockQueryManager';
import mockWatchQuery from './mocks/mockWatchQuery';
import { createApolloStore, } from '../src/store';
import gql from 'graphql-tag';
import { assert, } from 'chai';
import ApolloClient from '../src/ApolloClient';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import * as Rx from 'rxjs';
import { assign } from 'lodash';
import mockNetworkInterface from './mocks/mockNetworkInterface';
import { NetworkStatus } from '../src/queries/networkStatus';
import wrap from './util/wrap';
import observableToPromise, { observableToPromiseAndSubscription, } from './util/observableToPromise';
describe('QueryManager', function () {
    var dataIdFromObject = function (object) {
        if (object.__typename && object.id) {
            return object.__typename + '__' + object.id;
        }
        return undefined;
    };
    var defaultReduxRootSelector = function (state) { return state.apollo; };
    var createQueryManager = function (_a) {
        var networkInterface = _a.networkInterface, store = _a.store, reduxRootSelector = _a.reduxRootSelector, _b = _a.addTypename, addTypename = _b === void 0 ? false : _b;
        return new QueryManager({
            networkInterface: networkInterface || mockNetworkInterface(),
            store: store || createApolloStore(),
            reduxRootSelector: reduxRootSelector || defaultReduxRootSelector,
            addTypename: addTypename,
        });
    };
    var assertWithObserver = function (_a) {
        var done = _a.done, query = _a.query, _b = _a.variables, variables = _b === void 0 ? {} : _b, _c = _a.queryOptions, queryOptions = _c === void 0 ? {} : _c, result = _a.result, error = _a.error, delay = _a.delay, observer = _a.observer;
        var queryManager = mockQueryManager({
            request: { query: query, variables: variables },
            result: result,
            error: error,
            delay: delay,
        });
        var finalOptions = assign({ query: query, variables: variables }, queryOptions);
        return queryManager.watchQuery(finalOptions).subscribe({
            next: wrap(done, observer.next),
            error: observer.error,
        });
    };
    var assertRoundtrip = function (_a) {
        var done = _a.done, query = _a.query, data = _a.data, _b = _a.variables, variables = _b === void 0 ? {} : _b;
        assertWithObserver({
            done: done,
            query: query,
            result: { data: data },
            variables: variables,
            observer: {
                next: function (result) {
                    assert.deepEqual(result.data, data, 'Roundtrip assertion failed.');
                    done();
                },
            },
        });
    };
    var mockMutation = function (_a) {
        var mutation = _a.mutation, data = _a.data, _b = _a.variables, variables = _b === void 0 ? {} : _b, store = _a.store;
        if (!store) {
            store = createApolloStore();
        }
        var networkInterface = mockNetworkInterface({
            request: { query: mutation, variables: variables },
            result: { data: data },
        });
        var queryManager = createQueryManager({ networkInterface: networkInterface, store: store });
        return new Promise(function (resolve, reject) {
            queryManager.mutate({ mutation: mutation, variables: variables }).then(function (result) {
                resolve({ result: result, queryManager: queryManager });
            }).catch(function (error) {
                reject(error);
            });
        });
    };
    var assertMutationRoundtrip = function (opts) {
        return mockMutation(opts).then(function (_a) {
            var result = _a.result;
            assert.deepEqual(result.data, opts.data);
        });
    };
    var mockRefetch = function (_a) {
        var request = _a.request, firstResult = _a.firstResult, secondResult = _a.secondResult, thirdResult = _a.thirdResult;
        var args = [
            {
                request: request,
                result: firstResult,
            },
            {
                request: request,
                result: secondResult,
            },
        ];
        if (thirdResult) {
            args.push({ request: request, result: thirdResult });
        }
        return mockQueryManager.apply(void 0, args);
    };
    it('properly roundtrips through a Redux store', function (done) {
        assertRoundtrip({
            query: (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], gql(_a)),
            data: {
                allPeople: {
                    people: [
                        {
                            name: 'Luke Skywalker',
                        },
                    ],
                },
            },
            done: done,
        });
        var _a;
    });
    it('runs multiple root queries', function (done) {
        assertRoundtrip({
            query: (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n        person(id: \"1\") {\n          name\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n        person(id: \"1\") {\n          name\n        }\n      }\n    "], gql(_a)),
            data: {
                allPeople: {
                    people: [
                        {
                            name: 'Luke Skywalker',
                        },
                    ],
                },
                person: {
                    name: 'Luke Skywalker',
                },
            },
            done: done,
        });
        var _a;
    });
    it('properly roundtrips through a Redux store with variables', function (done) {
        assertRoundtrip({
            query: (_a = ["\n      query people($firstArg: Int) {\n        allPeople(first: $firstArg) {\n          people {\n            name\n          }\n        }\n      }"], _a.raw = ["\n      query people($firstArg: Int) {\n        allPeople(first: $firstArg) {\n          people {\n            name\n          }\n        }\n      }"], gql(_a)),
            variables: {
                firstArg: 1,
            },
            data: {
                allPeople: {
                    people: [
                        {
                            name: 'Luke Skywalker',
                        },
                    ],
                },
            },
            done: done,
        });
        var _a;
    });
    it('handles GraphQL errors', function (done) {
        assertWithObserver({
            done: done,
            query: (_a = ["\n          query people {\n            allPeople(first: 1) {\n              people {\n                name\n              }\n            }\n          }"], _a.raw = ["\n          query people {\n            allPeople(first: 1) {\n              people {\n                name\n              }\n            }\n          }"], gql(_a)),
            variables: {},
            result: {
                errors: [
                    {
                        name: 'Name',
                        message: 'This is an error message.',
                    },
                ],
            },
            observer: {
                next: function (result) {
                    done(new Error('Returned a result when it was supposed to error out'));
                },
                error: function (apolloError) {
                    assert(apolloError);
                    done();
                },
            },
        });
        var _a;
    });
    it('handles GraphQL errors with data returned', function (done) {
        assertWithObserver({
            done: done,
            query: (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], gql(_a)),
            result: {
                data: {
                    allPeople: {
                        people: {
                            name: 'Ada Lovelace',
                        },
                    },
                },
                errors: [
                    {
                        name: 'Name',
                        message: 'This is an error message.',
                    },
                ],
            },
            observer: {
                next: function (result) {
                    done(new Error('Returned data when it was supposed to error out.'));
                },
                error: function (apolloError) {
                    assert(apolloError);
                    done();
                },
            },
        });
        var _a;
    });
    it('empty error array (handle non-spec-compliant server) #156', function (done) {
        assertWithObserver({
            done: done,
            query: (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], gql(_a)),
            result: {
                data: {
                    allPeople: {
                        people: {
                            name: 'Ada Lovelace',
                        },
                    },
                },
                errors: [],
            },
            observer: {
                next: function (result) {
                    assert.equal(result.data['allPeople'].people.name, 'Ada Lovelace');
                    assert.notProperty(result, 'errors');
                    done();
                },
            },
        });
        var _a;
    });
    it('error array with nulls (handle non-spec-compliant server) #1185', function (done) {
        assertWithObserver({
            done: done,
            query: (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], gql(_a)),
            result: {
                errors: [null],
            },
            observer: {
                next: function () {
                    done(new Error('Should not fire next for an error'));
                },
                error: function (error) {
                    assert.deepEqual(error.graphQLErrors, [null]);
                    assert.equal(error.message, 'GraphQL error: Error message not found.');
                    done();
                },
            },
        });
        var _a;
    });
    it('handles network errors', function (done) {
        assertWithObserver({
            done: done,
            query: (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], gql(_a)),
            error: new Error('Network error'),
            observer: {
                next: function (result) {
                    done(new Error('Should not deliver result'));
                },
                error: function (error) {
                    var apolloError = error;
                    assert(apolloError.networkError);
                    assert.include(apolloError.networkError.message, 'Network error');
                    done();
                },
            },
        });
        var _a;
    });
    it('uses console.error to log unhandled errors', function (done) {
        var oldError = console.error;
        var printed;
        console.error = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            printed = args;
        };
        assertWithObserver({
            done: done,
            query: (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], gql(_a)),
            error: new Error('Network error'),
            observer: {
                next: function (result) {
                    done(new Error('Should not deliver result'));
                },
            },
        });
        setTimeout(function () {
            assert.match(printed[0], /error/);
            console.error = oldError;
            done();
        }, 10);
        var _a;
    });
    it('handles an unsubscribe action that happens before data returns', function (done) {
        var subscription = assertWithObserver({
            done: done,
            query: (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }"], gql(_a)),
            delay: 1000,
            observer: {
                next: function (result) {
                    done(new Error('Should not deliver result'));
                },
                error: function (error) {
                    done(new Error('Should not deliver result'));
                },
            },
        });
        assert.doesNotThrow(subscription.unsubscribe);
        done();
        var _a;
    });
    it('supports interoperability with other Observable implementations like RxJS', function (done) {
        var expResult = {
            data: {
                allPeople: {
                    people: [
                        {
                            name: 'Luke Skywalker',
                        },
                    ],
                },
            },
        };
        var handle = mockWatchQuery({
            request: {
                query: (_a = ["\n          query people {\n            allPeople(first: 1) {\n              people {\n              name\n            }\n          }\n        }"], _a.raw = ["\n          query people {\n            allPeople(first: 1) {\n              people {\n              name\n            }\n          }\n        }"], gql(_a)),
            },
            result: expResult,
        });
        var observable = Rx.Observable.from(handle);
        observable
            .map(function (result) { return (assign({ fromRx: true }, result)); })
            .subscribe({
            next: wrap(done, function (newResult) {
                var expectedResult = assign({ fromRx: true, loading: false, networkStatus: 7, stale: false }, expResult);
                assert.deepEqual(newResult, expectedResult);
                done();
            }),
        });
        var _a;
    });
    it('allows you to subscribe twice to one query', function (done) {
        var request = {
            query: (_a = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }"], _a.raw = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }"], gql(_a)),
            variables: {
                id: '1',
            },
        };
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        var data3 = {
            people_one: {
                name: 'Luke Skywalker has another name',
            },
        };
        var queryManager = mockQueryManager({
            request: request,
            result: { data: data1 },
        }, {
            request: request,
            result: { data: data2 },
            delay: 100,
        }, {
            request: request,
            result: { data: data3 },
        });
        var subOneCount = 0;
        queryManager.query(request)
            .then(function () {
            var handle = queryManager.watchQuery(request);
            var subOne = handle.subscribe({
                next: function (result) {
                    subOneCount++;
                    if (subOneCount === 1) {
                        assert.deepEqual(result.data, data1);
                    }
                    else if (subOneCount === 2) {
                        assert.deepEqual(result.data, data2);
                    }
                },
            });
            var subTwoCount = 0;
            handle.subscribe({
                next: function (result) {
                    subTwoCount++;
                    if (subTwoCount === 1) {
                        assert.deepEqual(result.data, data1);
                        handle.refetch();
                    }
                    else if (subTwoCount === 2) {
                        assert.deepEqual(result.data, data2);
                        setTimeout(function () {
                            try {
                                assert.equal(subOneCount, 2);
                                subOne.unsubscribe();
                                handle.refetch();
                            }
                            catch (e) {
                                done(e);
                            }
                        }, 0);
                    }
                    else if (subTwoCount === 3) {
                        setTimeout(function () {
                            try {
                                assert.equal(subOneCount, 2);
                                done();
                            }
                            catch (e) {
                                done(e);
                            }
                        }, 0);
                    }
                },
            });
        });
        var _a;
    });
    it('allows you to refetch queries', function () {
        var request = {
            query: (_a = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }"], _a.raw = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }"], gql(_a)),
            variables: {
                id: '1',
            },
            notifyOnNetworkStatusChange: false,
        };
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        var queryManager = mockRefetch({
            request: request,
            firstResult: { data: data1 },
            secondResult: { data: data2 },
        });
        var observable = queryManager.watchQuery(request);
        return observableToPromise({ observable: observable }, function (result) {
            assert.deepEqual(result.data, data1);
            observable.refetch();
        }, function (result) { return assert.deepEqual(result.data, data2); });
        var _a;
    });
    it('will return referentially equivalent data if nothing changed in a refetch', function (done) {
        var request = {
            query: (_a = ["\n        {\n          a\n          b { c }\n          d { e f { g } }\n        }\n      "], _a.raw = ["\n        {\n          a\n          b { c }\n          d { e f { g } }\n        }\n      "], gql(_a)),
            notifyOnNetworkStatusChange: false,
        };
        var data1 = {
            a: 1,
            b: { c: 2 },
            d: { e: 3, f: { g: 4 } },
        };
        var data2 = {
            a: 1,
            b: { c: 2 },
            d: { e: 30, f: { g: 4 } },
        };
        var data3 = {
            a: 1,
            b: { c: 2 },
            d: { e: 3, f: { g: 4 } },
        };
        var queryManager = mockRefetch({
            request: request,
            firstResult: { data: data1 },
            secondResult: { data: data2 },
            thirdResult: { data: data3 },
        });
        var observable = queryManager.watchQuery(request);
        var count = 0;
        var firstResultData;
        observable.subscribe({
            next: function (result) {
                try {
                    switch (count++) {
                        case 0:
                            assert.deepEqual(result.data, data1);
                            firstResultData = result.data;
                            observable.refetch();
                            break;
                        case 1:
                            assert.deepEqual(result.data, data2);
                            assert.notStrictEqual(result.data, firstResultData);
                            assert.strictEqual(result.data.b, firstResultData.b);
                            assert.notStrictEqual(result.data.d, firstResultData.d);
                            assert.strictEqual(result.data.d.f, firstResultData.d.f);
                            observable.refetch();
                            break;
                        case 2:
                            assert.deepEqual(result.data, data3);
                            assert.notStrictEqual(result.data, firstResultData);
                            assert.strictEqual(result.data.b, firstResultData.b);
                            assert.notStrictEqual(result.data.d, firstResultData.d);
                            assert.strictEqual(result.data.d.f, firstResultData.d.f);
                            done();
                            break;
                        default:
                            throw new Error('Next run too many times.');
                    }
                }
                catch (error) {
                    done(error);
                }
            },
            error: function (error) {
                return done(error);
            },
        });
        var _a;
    });
    it('will return referentially equivalent data in getCurrentResult if nothing changed', function (done) {
        var request = {
            query: (_a = ["\n        {\n          a\n          b { c }\n          d { e f { g } }\n        }\n      "], _a.raw = ["\n        {\n          a\n          b { c }\n          d { e f { g } }\n        }\n      "], gql(_a)),
            notifyOnNetworkStatusChange: false,
        };
        var data1 = {
            a: 1,
            b: { c: 2 },
            d: { e: 3, f: { g: 4 } },
        };
        var queryManager = mockQueryManager({
            request: request,
            result: { data: data1 },
        });
        var observable = queryManager.watchQuery(request);
        observable.subscribe({
            next: function (result) {
                try {
                    assert.deepEqual(result.data, data1);
                    assert.strictEqual(result.data, observable.currentResult().data);
                    done();
                }
                catch (error) {
                    done(error);
                }
            },
            error: function (error) {
                return done(error);
            },
        });
        var _a;
    });
    it('sets networkStatus to `refetch` when refetching', function () {
        var request = {
            query: (_a = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }"], _a.raw = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }"], gql(_a)),
            variables: {
                id: '1',
            },
            notifyOnNetworkStatusChange: true,
        };
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        var queryManager = mockRefetch({
            request: request,
            firstResult: { data: data1 },
            secondResult: { data: data2 },
        });
        var observable = queryManager.watchQuery(request);
        return observableToPromise({ observable: observable }, function (result) {
            assert.deepEqual(result.data, data1);
            observable.refetch();
        }, function (result) { return assert.equal(result.networkStatus, NetworkStatus.refetch); }, function (result) {
            assert.equal(result.networkStatus, NetworkStatus.ready);
            assert.deepEqual(result.data, data2);
        });
        var _a;
    });
    it('allows you to refetch queries with promises', function () {
        var request = {
            query: (_a = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }"], _a.raw = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }"], gql(_a)),
        };
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        var queryManager = mockRefetch({
            request: request,
            firstResult: { data: data1 },
            secondResult: { data: data2 },
        });
        var handle = queryManager.watchQuery(request);
        handle.subscribe({});
        return handle.refetch().then(function (result) { return assert.deepEqual(result.data, data2); });
        var _a;
    });
    it('returns frozen results from refetch', function () {
        var request = {
            query: (_a = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }"], _a.raw = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }"], gql(_a)),
        };
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        var queryManager = mockRefetch({
            request: request,
            firstResult: { data: data1 },
            secondResult: { data: data2 },
        });
        var handle = queryManager.watchQuery(request);
        handle.subscribe({});
        return handle.refetch().then(function (result) {
            assert.deepEqual(result.data, data2);
            assert.throws(function () { return result.data.stuff = 'awful'; });
        });
        var _a;
    });
    it('allows you to refetch queries with new variables', function () {
        var query = (_a = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], gql(_a));
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        var data3 = {
            people_one: {
                name: 'Luke Skywalker has a new name and age',
            },
        };
        var data4 = {
            people_one: {
                name: 'Luke Skywalker has a whole new bag',
            },
        };
        var variables1 = {
            test: 'I am your father',
        };
        var variables2 = {
            test: "No. No! That's not true! That's impossible!",
        };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data1 },
        }, {
            request: { query: query },
            result: { data: data2 },
        }, {
            request: { query: query, variables: variables1 },
            result: { data: data3 },
        }, {
            request: { query: query, variables: variables2 },
            result: { data: data4 },
        });
        var observable = queryManager.watchQuery({ query: query, notifyOnNetworkStatusChange: false });
        return observableToPromise({ observable: observable }, function (result) {
            assert.deepEqual(result.data, data1);
            observable.refetch();
        }, function (result) {
            assert.deepEqual(result.data, data2);
            observable.refetch(variables1);
        }, function (result) {
            assert.isTrue(result.loading);
            assert.deepEqual(result.data, data2);
        }, function (result) {
            assert.deepEqual(result.data, data3);
            observable.refetch(variables2);
        }, function (result) {
            assert.isTrue(result.loading);
            assert.deepEqual(result.data, data3);
        }, function (result) {
            assert.deepEqual(result.data, data4);
        });
        var _a;
    });
    it('only modifies varaibles when refetching', function () {
        var query = (_a = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], gql(_a));
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data1 },
        }, {
            request: { query: query },
            result: { data: data2 },
        });
        var observable = queryManager.watchQuery({ query: query, notifyOnNetworkStatusChange: false });
        var originalOptions = assign({}, observable.options);
        return observableToPromise({ observable: observable }, function (result) {
            assert.deepEqual(result.data, data1);
            observable.refetch();
        }, function (result) {
            assert.deepEqual(result.data, data2);
            var updatedOptions = assign({}, observable.options);
            delete originalOptions.variables;
            delete updatedOptions.variables;
            assert.deepEqual(updatedOptions, originalOptions);
        });
        var _a;
    });
    it('continues to poll after refetch', function () {
        var query = (_a = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], gql(_a));
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        var data3 = {
            people_one: {
                name: 'Patsy',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data1 },
        }, {
            request: { query: query },
            result: { data: data2 },
        }, {
            request: { query: query },
            result: { data: data3 },
        });
        var observable = queryManager.watchQuery({
            query: query,
            pollInterval: 200,
            notifyOnNetworkStatusChange: false,
        });
        return observableToPromise({ observable: observable }, function (result) {
            assert.deepEqual(result.data, data1);
            observable.refetch();
        }, function (result) { return assert.deepEqual(result.data, data2); }, function (result) {
            assert.deepEqual(result.data, data3);
            observable.stopPolling();
            assert(result);
        });
        var _a;
    });
    it('sets networkStatus to `poll` if a polling query is in flight', function (done) {
        var query = (_a = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], gql(_a));
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        var data3 = {
            people_one: {
                name: 'Patsy',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data1 },
        }, {
            request: { query: query },
            result: { data: data2 },
        }, {
            request: { query: query },
            result: { data: data3 },
        });
        var observable = queryManager.watchQuery({
            query: query,
            pollInterval: 30,
            notifyOnNetworkStatusChange: true,
        });
        var counter = 0;
        var handle = observable.subscribe({
            next: function (result) {
                counter += 1;
                if (counter === 1) {
                    assert.equal(result.networkStatus, NetworkStatus.ready);
                }
                else if (counter === 2) {
                    assert.equal(result.networkStatus, NetworkStatus.poll);
                    handle.unsubscribe();
                    done();
                }
            },
        });
        var _a;
    });
    it('can handle null values in arrays (#1551)', function (done) {
        var query = (_a = ["{ list { value } }"], _a.raw = ["{ list { value } }"], gql(_a));
        var data = { list: [null, { value: 1 }] };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data },
        });
        var observable = queryManager.watchQuery({ query: query });
        observable.subscribe({
            next: function (result) {
                assert.deepEqual(result.data, data);
                assert.deepEqual(observable.currentResult().data, data);
                done();
            },
        });
        var _a;
    });
    it('deepFreezes results in development mode', function () {
        var query = (_a = ["{ stuff }"], _a.raw = ["{ stuff }"], gql(_a));
        var data = { stuff: 'wonderful' };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data },
        });
        return queryManager.query({ query: query })
            .then(function (result) {
            assert.deepEqual(result.data, data);
            assert.throws(function () { return result.data.stuff = 'awful'; });
        });
        var _a;
    });
    it('should error if we pass fetchPolicy = cache-first or cache-only on a polling query', function (done) {
        assert.throw(function () {
            assertWithObserver({
                done: done,
                observer: {
                    next: function (result) {
                        done(new Error('Returned a result when it should not have.'));
                    },
                },
                query: (_a = ["\n          query {\n            author {\n              firstName\n              lastName\n            }\n          }"], _a.raw = ["\n          query {\n            author {\n              firstName\n              lastName\n            }\n          }"], gql(_a)),
                queryOptions: { pollInterval: 200, fetchPolicy: 'cache-only' },
            });
            var _a;
        });
        assert.throw(function () {
            assertWithObserver({
                done: done,
                observer: {
                    next: function (result) {
                        done(new Error('Returned a result when it should not have.'));
                    },
                },
                query: (_a = ["\n          query {\n            author {\n              firstName\n              lastName\n            }\n          }"], _a.raw = ["\n          query {\n            author {\n              firstName\n              lastName\n            }\n          }"], gql(_a)),
                queryOptions: { pollInterval: 200, fetchPolicy: 'cache-first' },
            });
            var _a;
        });
        done();
    });
    it('supports cache-only fetchPolicy fetching only cached data', function () {
        var primeQuery = (_a = ["\n      query primeQuery {\n        luke: people_one(id: 1) {\n          name\n        }\n      }\n    "], _a.raw = ["\n      query primeQuery {\n        luke: people_one(id: 1) {\n          name\n        }\n      }\n    "], gql(_a));
        var complexQuery = (_b = ["\n      query complexQuery {\n        luke: people_one(id: 1) {\n          name\n        }\n        vader: people_one(id: 4) {\n          name\n        }\n      }\n    "], _b.raw = ["\n      query complexQuery {\n        luke: people_one(id: 1) {\n          name\n        }\n        vader: people_one(id: 4) {\n          name\n        }\n      }\n    "], gql(_b));
        var data1 = {
            luke: {
                name: 'Luke Skywalker',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: primeQuery },
            result: { data: data1 },
        });
        return queryManager.query({
            query: primeQuery,
        }).then(function () {
            var handle = queryManager.watchQuery({
                query: complexQuery,
                fetchPolicy: 'cache-only',
            });
            return handle.result().then(function (result) {
                assert.equal(result.data['luke'].name, 'Luke Skywalker');
                assert.notProperty(result.data, 'vader');
            });
        });
        var _a, _b;
    });
    it('runs a mutation', function () {
        return assertMutationRoundtrip({
            mutation: (_a = ["\n        mutation makeListPrivate {\n          makeListPrivate(id: \"5\")\n        }"], _a.raw = ["\n        mutation makeListPrivate {\n          makeListPrivate(id: \"5\")\n        }"], gql(_a)),
            data: { makeListPrivate: true },
        });
        var _a;
    });
    it('runs a mutation with variables', function () {
        return assertMutationRoundtrip({
            mutation: (_a = ["\n        mutation makeListPrivate($listId: ID!) {\n          makeListPrivate(id: $listId)\n        }"], _a.raw = ["\n        mutation makeListPrivate($listId: ID!) {\n          makeListPrivate(id: $listId)\n        }"], gql(_a)),
            variables: { listId: '1' },
            data: { makeListPrivate: true },
        });
        var _a;
    });
    var getIdField = function (_a) {
        var id = _a.id;
        return id;
    };
    it('runs a mutation with object parameters and puts the result in the store', function () {
        var data = {
            makeListPrivate: {
                id: '5',
                isPrivate: true,
            },
        };
        return mockMutation({
            mutation: (_a = ["\n        mutation makeListPrivate {\n          makeListPrivate(input: {id: \"5\"}) {\n            id,\n            isPrivate,\n          }\n        }"], _a.raw = ["\n        mutation makeListPrivate {\n          makeListPrivate(input: {id: \"5\"}) {\n            id,\n            isPrivate,\n          }\n        }"], gql(_a)),
            data: data,
            store: createApolloStore({
                config: { dataIdFromObject: getIdField },
            }),
        }).then(function (_a) {
            var result = _a.result, queryManager = _a.queryManager;
            assert.deepEqual(result.data, data);
            assert.deepEqual(queryManager.store.getState()['apollo'].data['5'], { id: '5', isPrivate: true });
        });
        var _a;
    });
    it('runs a mutation and puts the result in the store', function () {
        var data = {
            makeListPrivate: {
                id: '5',
                isPrivate: true,
            },
        };
        return mockMutation({
            mutation: (_a = ["\n        mutation makeListPrivate {\n          makeListPrivate(id: \"5\") {\n            id,\n            isPrivate,\n          }\n        }"], _a.raw = ["\n        mutation makeListPrivate {\n          makeListPrivate(id: \"5\") {\n            id,\n            isPrivate,\n          }\n        }"], gql(_a)),
            data: data,
            store: createApolloStore({
                config: { dataIdFromObject: getIdField },
            }),
        }).then(function (_a) {
            var result = _a.result, queryManager = _a.queryManager;
            assert.deepEqual(result.data, data);
            assert.deepEqual(queryManager.store.getState()['apollo'].data['5'], { id: '5', isPrivate: true });
        });
        var _a;
    });
    it('runs a mutation and puts the result in the store with root key', function () {
        var mutation = (_a = ["\n      mutation makeListPrivate {\n        makeListPrivate(id: \"5\") {\n          id,\n          isPrivate,\n        }\n      }\n    "], _a.raw = ["\n      mutation makeListPrivate {\n        makeListPrivate(id: \"5\") {\n          id,\n          isPrivate,\n        }\n      }\n    "], gql(_a));
        var data = {
            makeListPrivate: {
                id: '5',
                isPrivate: true,
            },
        };
        var reduxRootKey = 'test';
        var reduxRootSelector = function (state) { return state[reduxRootKey]; };
        var store = createApolloStore({
            reduxRootKey: reduxRootKey,
            config: { dataIdFromObject: getIdField },
        });
        var queryManager = createQueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: mutation },
                result: { data: data },
            }),
            store: store,
            reduxRootSelector: reduxRootSelector,
        });
        return queryManager.mutate({
            mutation: mutation,
        }).then(function (result) {
            assert.deepEqual(result.data, data);
            assert.deepEqual(reduxRootSelector(store.getState()).data['5'], { id: '5', isPrivate: true });
        });
        var _a;
    });
    it('does not broadcast queries when non-apollo actions are dispatched', function () {
        var query = (_a = ["\n      query fetchLuke($id: String) {\n        people_one(id: $id) {\n          name\n        }\n      }\n    "], _a.raw = ["\n      query fetchLuke($id: String) {\n        people_one(id: $id) {\n          name\n        }\n      }\n    "], gql(_a));
        var variables = {
            id: '1',
        };
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        function testReducer(state, action) {
            if (state === void 0) { state = false; }
            if (action.type === 'TOGGLE') {
                return true;
            }
            return state;
        }
        var client = new ApolloClient();
        var store = createStore(combineReducers({
            test: testReducer,
            apollo: client.reducer(),
        }), applyMiddleware(client.middleware()));
        var observable = createQueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: query, variables: variables },
                result: { data: data1 },
            }, {
                request: { query: query, variables: variables },
                result: { data: data2 },
            }),
            store: store,
        }).watchQuery({ query: query, variables: variables, notifyOnNetworkStatusChange: false });
        return observableToPromise({ observable: observable }, function (result) {
            assert.deepEqual(result.data, data1);
            observable.refetch();
        }, function (result) {
            assert.deepEqual(result.data, data2);
            store.dispatch({
                type: 'TOGGLE',
            });
        });
        var _a;
    });
    it('does not call broadcastNewStore when Apollo state is not affected by an action', function () {
        var query = (_a = ["\n      query fetchLuke($id: String) {\n        people_one(id: $id) {\n          name\n        }\n      }\n    "], _a.raw = ["\n      query fetchLuke($id: String) {\n        people_one(id: $id) {\n          name\n        }\n      }\n    "], gql(_a));
        var variables = {
            id: '1',
        };
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
            },
        };
        function testReducer(state, action) {
            if (state === void 0) { state = false; }
            if (action.type === 'TOGGLE') {
                return true;
            }
            return state;
        }
        var client = new ApolloClient();
        var store = createStore(combineReducers({
            test: testReducer,
            apollo: client.reducer(),
        }), applyMiddleware(client.middleware()));
        var qm = createQueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: query, variables: variables },
                result: { data: data1 },
            }, {
                request: { query: query, variables: variables },
                result: { data: data2 },
            }),
            store: store,
        });
        var observable = qm.watchQuery({ query: query, variables: variables, notifyOnNetworkStatusChange: false });
        return observableToPromise({ observable: observable }, function (result) {
            assert.deepEqual(result.data, data1);
            observable.refetch();
        }, function (result) {
            assert.deepEqual(result.data, data2);
            var called = false;
            client.queryManager.broadcastNewStore = function (s) {
                called = true;
            };
            store.dispatch({
                type: 'TOGGLE',
            });
            assert.equal(store.getState().test, true, 'test state should have been updated');
            assert.equal(called, false, 'broadcastNewStore should not have been called');
        });
        var _a;
    });
    it("doesn't return data while query is loading", function () {
        var query1 = (_a = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }\n    "], gql(_a));
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
            },
        };
        var query2 = (_b = ["\n      {\n        people_one(id: 5) {\n          name\n        }\n      }\n    "], _b.raw = ["\n      {\n        people_one(id: 5) {\n          name\n        }\n      }\n    "], gql(_b));
        var data2 = {
            people_one: {
                name: 'Darth Vader',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: query1 },
            result: { data: data1 },
            delay: 10,
        }, {
            request: { query: query2 },
            result: { data: data2 },
        });
        var observable1 = queryManager.watchQuery({ query: query1 });
        var observable2 = queryManager.watchQuery({ query: query2 });
        return Promise.all([
            observableToPromise({ observable: observable1 }, function (result) { return assert.deepEqual(result.data, data1); }),
            observableToPromise({ observable: observable2 }, function (result) { return assert.deepEqual(result.data, data2); }),
        ]);
        var _a, _b;
    });
    it("updates result of previous query if the result of a new query overlaps", function () {
        var query1 = (_a = ["\n      {\n        people_one(id: 1) {\n          name\n          age\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: 1) {\n          name\n          age\n        }\n      }\n    "], gql(_a));
        var data1 = {
            people_one: {
                name: 'Luke Skywalker',
                age: 50,
            },
        };
        var query2 = (_b = ["\n      {\n        people_one(id: 1) {\n          name\n          username\n        }\n      }\n    "], _b.raw = ["\n      {\n        people_one(id: 1) {\n          name\n          username\n        }\n      }\n    "], gql(_b));
        var data2 = {
            people_one: {
                name: 'Luke Skywalker has a new name',
                username: 'luke',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: query1 },
            result: { data: data1 },
        }, {
            request: { query: query2 },
            result: { data: data2 },
            delay: 10,
        });
        var observable = queryManager.watchQuery({ query: query1 });
        return observableToPromise({ observable: observable }, function (result) {
            assert.deepEqual(result.data, data1);
            queryManager.query({ query: query2 });
        }, function (result) { return assert.deepEqual(result.data, {
            people_one: {
                name: 'Luke Skywalker has a new name',
                age: 50,
            },
        }); });
        var _a, _b;
    });
    describe('polling queries', function () {
        it('allows you to poll queries', function () {
            var query = (_a = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], _a.raw = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], gql(_a));
            var variables = {
                id: '1',
            };
            var data1 = {
                people_one: {
                    name: 'Luke Skywalker',
                },
            };
            var data2 = {
                people_one: {
                    name: 'Luke Skywalker has a new name',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { data: data1 },
            }, {
                request: { query: query, variables: variables },
                result: { data: data2 },
            });
            var observable = queryManager.watchQuery({
                query: query,
                variables: variables,
                pollInterval: 50,
                notifyOnNetworkStatusChange: false,
            });
            return observableToPromise({ observable: observable }, function (result) { return assert.deepEqual(result.data, data1); }, function (result) { return assert.deepEqual(result.data, data2); });
            var _a;
        });
        it('does not poll during SSR', function (done) {
            var query = (_a = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], _a.raw = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], gql(_a));
            var variables = {
                id: '1',
            };
            var data1 = {
                people_one: {
                    name: 'Luke Skywalker',
                },
            };
            var data2 = {
                people_one: {
                    name: 'Luke Skywalker has a new name',
                },
            };
            var queryManager = new QueryManager({
                networkInterface: mockNetworkInterface({
                    request: { query: query, variables: variables },
                    result: { data: data1 },
                }, {
                    request: { query: query, variables: variables },
                    result: { data: data2 },
                }, {
                    request: { query: query, variables: variables },
                    result: { data: data2 },
                }),
                store: createApolloStore(),
                reduxRootSelector: defaultReduxRootSelector,
                addTypename: false,
                ssrMode: true,
            });
            var observable = queryManager.watchQuery({
                query: query,
                variables: variables,
                pollInterval: 10,
                notifyOnNetworkStatusChange: false,
            });
            var count = 1;
            var doneCalled = false;
            var subHandle = observable.subscribe({
                next: function (result) {
                    switch (count) {
                        case 1:
                            assert.deepEqual(result.data, data1);
                            setTimeout(function () {
                                subHandle.unsubscribe();
                                if (!doneCalled) {
                                    done();
                                }
                            }, 15);
                            count++;
                            break;
                        case 2:
                        default:
                            doneCalled = true;
                            done(new Error('Only expected one result, not multiple'));
                    }
                },
            });
            var _a;
        });
        it('should let you handle multiple polled queries and unsubscribe from one of them', function (done) {
            var query1 = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var query2 = (_b = ["\n        query {\n          person {\n            name\n          }\n        }"], _b.raw = ["\n        query {\n          person {\n            name\n          }\n        }"], gql(_b));
            var data11 = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var data12 = {
                author: {
                    firstName: 'Jack',
                    lastName: 'Smith',
                },
            };
            var data13 = {
                author: {
                    firstName: 'Jolly',
                    lastName: 'Smith',
                },
            };
            var data14 = {
                author: {
                    firstName: 'Jared',
                    lastName: 'Smith',
                },
            };
            var data21 = {
                person: {
                    name: 'Jane Smith',
                },
            };
            var data22 = {
                person: {
                    name: 'Josey Smith',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query1 },
                result: { data: data11 },
            }, {
                request: { query: query1 },
                result: { data: data12 },
            }, {
                request: { query: query1 },
                result: { data: data13 },
            }, {
                request: { query: query1 },
                result: { data: data14 },
            }, {
                request: { query: query2 },
                result: { data: data21 },
            }, {
                request: { query: query2 },
                result: { data: data22 },
            });
            var handle1Count = 0;
            var handleCount = 0;
            var setMilestone = false;
            var subscription1 = queryManager.watchQuery({
                query: query1,
                pollInterval: 150,
            }).subscribe({
                next: function (result) {
                    handle1Count++;
                    handleCount++;
                    if (handle1Count > 1 && !setMilestone) {
                        subscription1.unsubscribe();
                        setMilestone = true;
                    }
                },
            });
            var subscription2 = queryManager.watchQuery({
                query: query2,
                pollInterval: 2000,
            }).subscribe({
                next: function (result) {
                    handleCount++;
                },
            });
            setTimeout(function () {
                assert.equal(handleCount, 3);
                subscription1.unsubscribe();
                subscription2.unsubscribe();
                done();
            }, 400);
            var _a, _b;
        });
        it('allows you to unsubscribe from polled queries', function () {
            var query = (_a = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], _a.raw = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], gql(_a));
            var variables = {
                id: '1',
            };
            var data1 = {
                people_one: {
                    name: 'Luke Skywalker',
                },
            };
            var data2 = {
                people_one: {
                    name: 'Luke Skywalker has a new name',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { data: data1 },
            }, {
                request: { query: query, variables: variables },
                result: { data: data2 },
            });
            var observable = queryManager.watchQuery({
                query: query,
                variables: variables,
                pollInterval: 50,
                notifyOnNetworkStatusChange: false,
            });
            var _b = observableToPromiseAndSubscription({
                observable: observable,
                wait: 60,
            }, function (result) { return assert.deepEqual(result.data, data1); }, function (result) {
                assert.deepEqual(result.data, data2);
                subscription.unsubscribe();
            }), promise = _b.promise, subscription = _b.subscription;
            return promise;
            var _a;
        });
        it('allows you to unsubscribe from polled query errors', function () {
            var query = (_a = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], _a.raw = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], gql(_a));
            var variables = {
                id: '1',
            };
            var data1 = {
                people_one: {
                    name: 'Luke Skywalker',
                },
            };
            var data2 = {
                people_one: {
                    name: 'Luke Skywalker has a new name',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { data: data1 },
            }, {
                request: { query: query, variables: variables },
                error: new Error('Network error'),
            }, {
                request: { query: query, variables: variables },
                result: { data: data2 },
            });
            var observable = queryManager.watchQuery({
                query: query,
                variables: variables,
                pollInterval: 50,
                notifyOnNetworkStatusChange: false,
            });
            var _b = observableToPromiseAndSubscription({
                observable: observable,
                wait: 60,
                errorCallbacks: [
                    function (error) {
                        assert.include(error.message, 'Network error');
                        subscription.unsubscribe();
                    },
                ],
            }, function (result) { return assert.deepEqual(result.data, data1); }), promise = _b.promise, subscription = _b.subscription;
            return promise;
            var _a;
        });
        it('exposes a way to start a polling query', function () {
            var query = (_a = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], _a.raw = ["\n        query fetchLuke($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], gql(_a));
            var variables = {
                id: '1',
            };
            var data1 = {
                people_one: {
                    name: 'Luke Skywalker',
                },
            };
            var data2 = {
                people_one: {
                    name: 'Luke Skywalker has a new name',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { data: data1 },
            }, {
                request: { query: query, variables: variables },
                result: { data: data2 },
            });
            var observable = queryManager.watchQuery({ query: query, variables: variables, notifyOnNetworkStatusChange: false });
            observable.startPolling(50);
            return observableToPromise({ observable: observable }, function (result) { return assert.deepEqual(result.data, data1); }, function (result) { return assert.deepEqual(result.data, data2); });
            var _a;
        });
        it('exposes a way to stop a polling query', function () {
            var query = (_a = ["\n        query fetchLeia($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], _a.raw = ["\n        query fetchLeia($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], gql(_a));
            var variables = {
                id: '2',
            };
            var data1 = {
                people_one: {
                    name: 'Leia Skywalker',
                },
            };
            var data2 = {
                people_one: {
                    name: 'Leia Skywalker has a new name',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { data: data1 },
            }, {
                request: { query: query, variables: variables },
                result: { data: data2 },
            });
            var observable = queryManager.watchQuery({
                query: query,
                variables: variables,
                pollInterval: 50,
            });
            return observableToPromise({ observable: observable, wait: 60 }, function (result) {
                assert.deepEqual(result.data, data1);
                observable.stopPolling();
            });
            var _a;
        });
        it('stopped polling queries still get updates', function () {
            var query = (_a = ["\n        query fetchLeia($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], _a.raw = ["\n        query fetchLeia($id: String) {\n          people_one(id: $id) {\n            name\n          }\n        }\n      "], gql(_a));
            var variables = {
                id: '2',
            };
            var data1 = {
                people_one: {
                    name: 'Leia Skywalker',
                },
            };
            var data2 = {
                people_one: {
                    name: 'Leia Skywalker has a new name',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { data: data1 },
            }, {
                request: { query: query, variables: variables },
                result: { data: data2 },
            });
            var observable = queryManager.watchQuery({
                query: query,
                variables: variables,
                pollInterval: 50,
            });
            var timeout;
            return Promise.race([
                observableToPromise({ observable: observable }, function (result) {
                    assert.deepEqual(result.data, data1);
                    queryManager.query({ query: query, variables: variables, fetchPolicy: 'network-only' })
                        .then(function () { return timeout(new Error('Should have two results by now')); });
                }, function (result) { return assert.deepEqual(result.data, data2); }),
                new Promise(function (resolve, reject) {
                    timeout = function (error) { return reject(error); };
                }),
            ]);
            var _a;
        });
    });
    it('warns if you forget the template literal tag', function () {
        var queryManager = mockQueryManager();
        assert.throws(function () {
            queryManager.query({
                query: 'string',
            });
        }, /wrap the query string in a "gql" tag/);
        assert.throws(function () {
            queryManager.mutate({
                mutation: 'string',
            });
        }, /wrap the query string in a "gql" tag/);
        assert.throws(function () {
            queryManager.watchQuery({
                query: 'string',
            });
        }, /wrap the query string in a "gql" tag/);
    });
    it('should transform queries correctly when given a QueryTransformer', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var transformedQuery = (_b = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], _b.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], gql(_b));
        var unmodifiedQueryResult = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var transformedQueryResult = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
                '__typename': 'Author',
            },
        };
        createQueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: query },
                result: { data: unmodifiedQueryResult },
            }, {
                request: { query: transformedQuery },
                result: { data: transformedQueryResult },
            }),
            addTypename: true,
        }).query({ query: query }).then(function (result) {
            assert.deepEqual(result.data, transformedQueryResult);
            done();
        });
        var _a, _b;
    });
    it('should transform mutations correctly', function (done) {
        var mutation = (_a = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var transformedMutation = (_b = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n          __typename\n        }\n      }"], _b.raw = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n          __typename\n        }\n      }"], gql(_b));
        var unmodifiedMutationResult = {
            'createAuthor': {
                'firstName': 'It works!',
                'lastName': 'It works!',
            },
        };
        var transformedMutationResult = {
            'createAuthor': {
                'firstName': 'It works!',
                'lastName': 'It works!',
                '__typename': 'Author',
            },
        };
        createQueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: mutation },
                result: { data: unmodifiedMutationResult },
            }, {
                request: { query: transformedMutation },
                result: { data: transformedMutationResult },
            }),
            addTypename: true,
        }).mutate({ mutation: mutation }).then(function (result) {
            assert.deepEqual(result.data, transformedMutationResult);
            done();
        });
        var _a, _b;
    });
    describe('store resets', function () {
        it('returns a promise resolving when all queries have been refetched', function () {
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var dataChanged = {
                author: {
                    firstName: 'John changed',
                    lastName: 'Smith',
                },
            };
            var query2 = (_b = ["\n        query {\n          author2 {\n            firstName\n            lastName\n          }\n        }"], _b.raw = ["\n        query {\n          author2 {\n            firstName\n            lastName\n          }\n        }"], gql(_b));
            var data2 = {
                author2: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var data2Changed = {
                author2: {
                    firstName: 'John changed',
                    lastName: 'Smith',
                },
            };
            var queryManager = createQueryManager({
                networkInterface: mockNetworkInterface({
                    request: { query: query },
                    result: { data: data },
                }, {
                    request: { query: query2 },
                    result: { data: data2 },
                }, {
                    request: { query: query },
                    result: { data: dataChanged },
                }, {
                    request: { query: query2 },
                    result: { data: data2Changed },
                }),
            });
            var observable = queryManager.watchQuery({ query: query });
            var observable2 = queryManager.watchQuery({ query: query2 });
            return Promise.all([
                observableToPromise({ observable: observable }, function (result) { return assert.deepEqual(result.data, data); }),
                observableToPromise({ observable: observable2 }, function (result) { return assert.deepEqual(result.data, data2); }),
            ]).then(function () {
                observable.subscribe({ next: function () { return null; } });
                observable2.subscribe({ next: function () { return null; } });
                return queryManager.resetStore().then(function () {
                    var result = queryManager.getCurrentQueryResult(observable);
                    assert.isFalse(result.partial);
                    assert.deepEqual(result.data, dataChanged);
                    var result2 = queryManager.getCurrentQueryResult(observable2);
                    assert.isFalse(result2.partial);
                    assert.deepEqual(result2.data, data2Changed);
                });
            });
            var _a, _b;
        });
        it('should change the store state to an empty state', function () {
            var queryManager = createQueryManager({});
            queryManager.resetStore();
            var currentState = queryManager.getApolloState();
            var expectedState = {
                data: {},
                optimistic: [],
                reducerError: null,
            };
            assert.deepEqual(currentState, expectedState);
        });
        it('should only refetch once when we store reset', function () {
            var queryManager;
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var timesFired = 0;
            var networkInterface = {
                query: function (request) {
                    if (timesFired === 0) {
                        timesFired += 1;
                        queryManager.resetStore();
                    }
                    else {
                        timesFired += 1;
                    }
                    return Promise.resolve({ data: data });
                },
            };
            queryManager = createQueryManager({ networkInterface: networkInterface });
            var observable = queryManager.watchQuery({ query: query });
            return observableToPromise({ observable: observable, wait: 0 }, function (result) { return assert.deepEqual(result.data, data); }).then(function () {
                assert.equal(timesFired, 2);
            });
            var _a;
        });
        it('should not refetch toredown queries', function (done) {
            var queryManager;
            var observable;
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var timesFired = 0;
            var networkInterface = {
                query: function (request) {
                    timesFired += 1;
                    return Promise.resolve({ data: data });
                },
            };
            queryManager = createQueryManager({ networkInterface: networkInterface });
            observable = queryManager.watchQuery({ query: query });
            observableToPromise({ observable: observable, wait: 0 }, function (result) { return assert.deepEqual(result.data, data); }).then(function () {
                assert.equal(timesFired, 1);
                queryManager.resetStore();
                setTimeout(function () {
                    assert.equal(timesFired, 1);
                    done();
                }, 50);
            });
            var _a;
        });
        it('should not error on queries that are already in the store', function () {
            var queryManager;
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var timesFired = 0;
            var networkInterface = {
                query: function (request) {
                    if (timesFired === 0) {
                        timesFired += 1;
                        setTimeout(queryManager.resetStore.bind(queryManager), 10);
                    }
                    else {
                        timesFired += 1;
                    }
                    return Promise.resolve({ data: data });
                },
            };
            queryManager = createQueryManager({ networkInterface: networkInterface });
            var observable = queryManager.watchQuery({ query: query, notifyOnNetworkStatusChange: false });
            return observableToPromise({ observable: observable, wait: 20 }, function (result) { return assert.deepEqual(result.data, data); }).then(function () {
                assert.equal(timesFired, 2);
            });
            var _a;
        });
        it('should throw an error on an inflight fetch query if the store is reset', function (done) {
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query },
                result: { data: data },
                delay: 10000,
            });
            queryManager.fetchQuery('made up id', { query: query }).then(function (result) {
                done(new Error('Returned a result.'));
            }).catch(function (error) {
                assert.include(error.message, 'Store reset');
                done();
            });
            queryManager.resetStore();
            var _a;
        });
        it('should call refetch on a mocked Observable if the store is reset', function (done) {
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var queryManager = mockQueryManager();
            var mockObservableQuery = {
                refetch: function (variables) {
                    done();
                    return null;
                },
                options: {
                    query: query,
                },
                scheduler: queryManager.scheduler,
            };
            var queryId = 'super-fake-id';
            queryManager.addObservableQuery(queryId, mockObservableQuery);
            queryManager.resetStore();
            var _a;
        });
        it('should not call refetch on a cache-only Observable if the store is reset', function (done) {
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var queryManager = createQueryManager({});
            var options = assign({});
            options.fetchPolicy = 'cache-only';
            options.query = query;
            var refetchCount = 0;
            var mockObservableQuery = {
                refetch: function (variables) {
                    refetchCount++;
                    return null;
                },
                options: options,
                queryManager: queryManager,
            };
            var queryId = 'super-fake-id';
            queryManager.addObservableQuery(queryId, mockObservableQuery);
            queryManager.resetStore();
            setTimeout(function () {
                assert.equal(refetchCount, 0);
                done();
            }, 50);
            var _a;
        });
        it('should not call refetch on a standby Observable if the store is reset', function (done) {
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var queryManager = createQueryManager({});
            var options = assign({});
            options.fetchPolicy = 'standby';
            options.query = query;
            var refetchCount = 0;
            var mockObservableQuery = {
                refetch: function (variables) {
                    refetchCount++;
                    return null;
                },
                options: options,
                queryManager: queryManager,
            };
            var queryId = 'super-fake-id';
            queryManager.addObservableQuery(queryId, mockObservableQuery);
            queryManager.resetStore();
            setTimeout(function () {
                assert.equal(refetchCount, 0);
                done();
            }, 50);
            var _a;
        });
        it('should throw an error on an inflight query() if the store is reset', function (done) {
            var queryManager;
            var query = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var networkInterface = {
                query: function (request) {
                    queryManager.resetStore();
                    return Promise.resolve({ data: data });
                },
            };
            queryManager = createQueryManager({ networkInterface: networkInterface });
            queryManager.query({ query: query }).then(function (result) {
                done(new Error('query() gave results on a store reset'));
            }).catch(function (error) {
                done();
            });
            var _a;
        });
    });
    it('should reject a query promise given a network error', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var networkError = new Error('Network error');
        mockQueryManager({
            request: { query: query },
            error: networkError,
        }).query({ query: query }).then(function (result) {
            done(new Error('Returned result on an errored fetchQuery'));
        }).catch(function (error) {
            var apolloError = error;
            assert(apolloError.message);
            assert.equal(apolloError.networkError, networkError);
            assert.deepEqual(apolloError.graphQLErrors, []);
            done();
        }).catch(done);
        var _a;
    });
    it('should error when we attempt to give an id beginning with $', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n          id\n          __typename\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n          id\n          __typename\n        }\n      }"], gql(_a));
        var data = {
            author: {
                firstName: 'John',
                lastName: 'Smith',
                id: '129',
                __typename: 'Author',
            },
        };
        var reducerConfig = { dataIdFromObject: function (x) { return '$' + dataIdFromObject(x); } };
        var store = createApolloStore({ config: reducerConfig, reportCrashes: false });
        createQueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: query },
                result: { data: data },
            }),
            store: store,
        }).query({ query: query }).then(function (result) {
            done(new Error('Returned a result when it should not have.'));
        }).catch(function (error) {
            done();
        });
        var _a;
    });
    it('should reject a query promise given a GraphQL error', function () {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var graphQLErrors = [new Error('GraphQL error')];
        return mockQueryManager({
            request: { query: query },
            result: { errors: graphQLErrors },
        }).query({ query: query }).then(function (result) {
            throw new Error('Returned result on an errored fetchQuery');
        }, function (error) {
            var apolloError = error;
            assert(apolloError.message);
            assert.equal(apolloError.graphQLErrors, graphQLErrors);
            assert(!apolloError.networkError);
        });
        var _a;
    });
    it('should not empty the store when a non-polling query fails due to a network error', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            author: {
                firstName: 'Dhaivat',
                lastName: 'Pandya',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data },
        }, {
            request: { query: query },
            error: new Error('Network error ocurred'),
        });
        queryManager.query({ query: query }).then(function (result) {
            assert.deepEqual(result.data, data);
            queryManager.query({ query: query, fetchPolicy: 'network-only' }).then(function () {
                done(new Error('Returned a result when it was not supposed to.'));
            }).catch(function (error) {
                assert.deepEqual(queryManager.store.getState().apollo.data['$ROOT_QUERY.author'], data['author']);
                done();
            });
        }).catch(function (error) {
            done(new Error('Threw an error on the first query.'));
        });
        var _a;
    });
    it('should be able to unsubscribe from a polling query subscription', function () {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            author: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var observable = mockQueryManager({
            request: { query: query },
            result: { data: data },
        }).watchQuery({ query: query, pollInterval: 20 });
        var _b = observableToPromiseAndSubscription({
            observable: observable,
            wait: 60,
        }, function (result) {
            assert.deepEqual(result.data, data);
            subscription.unsubscribe();
        }), promise = _b.promise, subscription = _b.subscription;
        return promise;
        var _a;
    });
    it('should not empty the store when a polling query fails due to a network error', function () {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            author: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data },
        }, {
            request: { query: query },
            error: new Error('Network error occurred.'),
        });
        var observable = queryManager.watchQuery({ query: query, pollInterval: 20, notifyOnNetworkStatusChange: false });
        return observableToPromise({
            observable: observable,
            errorCallbacks: [
                function () {
                    assert.deepEqual(queryManager.store.getState().apollo.data['$ROOT_QUERY.author'], data.author);
                },
            ],
        }, function (result) {
            assert.deepEqual(result.data, data);
            assert.deepEqual(queryManager.store.getState().apollo.data['$ROOT_QUERY.author'], data.author);
        });
        var _a;
    });
    it('should not fire next on an observer if there is no change in the result', function () {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            author: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data },
        }, {
            request: { query: query },
            result: { data: data },
        });
        var observable = queryManager.watchQuery({ query: query });
        return Promise.all([
            observableToPromise({ observable: observable, wait: 100 }, function (result) {
                assert.deepEqual(result.data, data);
            }),
            queryManager.query({ query: query }).then(function (result) {
                assert.deepEqual(result.data, data);
            }),
        ]);
        var _a;
    });
    it('should store metadata with watched queries', function () {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            author: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var queryManager = mockQueryManager({
            request: { query: query },
            result: { data: data },
        });
        var observable = queryManager.watchQuery({
            query: query,
            metadata: { foo: 'bar' },
        });
        return observableToPromise({ observable: observable }, function (result) {
            assert.deepEqual(result.data, data);
            assert.deepEqual(queryManager.queryStore.get(observable.queryId).metadata, { foo: 'bar' });
        });
        var _a;
    });
    it('should return stale data when we orphan a real-id node in the store with a real-id node', function () {
        var query1 = (_a = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n          }\n          age\n          id\n          __typename\n        }\n      }\n    "], _a.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n          }\n          age\n          id\n          __typename\n        }\n      }\n    "], gql(_a));
        var query2 = (_b = ["\n      query {\n        author {\n          name {\n            firstName\n          }\n          id\n          __typename\n        }\n      }"], _b.raw = ["\n      query {\n        author {\n          name {\n            firstName\n          }\n          id\n          __typename\n        }\n      }"], gql(_b));
        var data1 = {
            author: {
                name: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
                age: 18,
                id: '187',
                __typename: 'Author',
            },
        };
        var data2 = {
            author: {
                name: {
                    firstName: 'John',
                },
                id: '197',
                __typename: 'Author',
            },
        };
        var reducerConfig = { dataIdFromObject: dataIdFromObject };
        var store = createApolloStore({ config: reducerConfig, reportCrashes: false });
        var queryManager = createQueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: query1 },
                result: { data: data1 },
            }, {
                request: { query: query2 },
                result: { data: data2 },
            }),
            store: store,
        });
        var observable1 = queryManager.watchQuery({ query: query1 });
        var observable2 = queryManager.watchQuery({ query: query2 });
        return Promise.all([
            observableToPromise({
                observable: observable1,
                wait: 60,
            }, function (result) {
                assert.deepEqual(result, {
                    data: data1,
                    loading: false,
                    networkStatus: NetworkStatus.ready,
                    stale: false,
                });
            }, function (result) {
                assert.deepEqual(result, {
                    data: data1,
                    loading: false,
                    networkStatus: NetworkStatus.ready,
                    stale: true,
                });
            }),
            observableToPromise({
                observable: observable2,
                wait: 60,
            }, function (result) {
                assert.deepEqual(result, {
                    data: data2,
                    loading: false,
                    networkStatus: NetworkStatus.ready,
                    stale: false,
                });
            }),
        ]);
        var _a, _b;
    });
    it('should error if we replace a real id node in the store with a generated id node', function () {
        var queryWithId = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n          id\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n          id\n        }\n      }"], gql(_a));
        var dataWithId = {
            author: {
                firstName: 'John',
                lastName: 'Smith',
                id: '129',
                __typename: 'Author',
            },
        };
        var queryWithoutId = (_b = ["\n      query {\n        author {\n          address\n        }\n      }"], _b.raw = ["\n      query {\n        author {\n          address\n        }\n      }"], gql(_b));
        var dataWithoutId = {
            author: {
                address: 'fake address',
            },
        };
        var reducerConfig = { dataIdFromObject: dataIdFromObject };
        var store = createApolloStore({ config: reducerConfig, reportCrashes: false });
        var queryManager = createQueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: queryWithId },
                result: { data: dataWithId },
            }, {
                request: { query: queryWithoutId },
                result: { data: dataWithoutId },
            }),
            store: store,
        });
        var observableWithId = queryManager.watchQuery({ query: queryWithId });
        var observableWithoutId = queryManager.watchQuery({ query: queryWithoutId });
        return Promise.all([
            observableToPromise({ observable: observableWithId, wait: 60 }, function (result) { return assert.deepEqual(result.data, dataWithId); }),
            observableToPromise({
                observable: observableWithoutId,
                errorCallbacks: [
                    function (error) { return assert.include(error.message, 'Store error'); },
                    function (error) { return assert.include(error.message, 'Store error'); },
                ],
                wait: 60,
            }),
        ]);
        var _a, _b;
    });
    it('should not error when merging a generated id store node  with a real id node', function () {
        var queryWithoutId = (_a = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n          }\n          age\n          __typename\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n          }\n          age\n          __typename\n        }\n      }"], gql(_a));
        var queryWithId = (_b = ["\n      query {\n        author {\n          name {\n            firstName\n          }\n          id\n          __typename\n        }\n      }"], _b.raw = ["\n      query {\n        author {\n          name {\n            firstName\n          }\n          id\n          __typename\n        }\n      }"], gql(_b));
        var dataWithoutId = {
            author: {
                name: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
                age: '124',
                __typename: 'Author',
            },
        };
        var dataWithId = {
            author: {
                name: {
                    firstName: 'Jane',
                },
                id: '129',
                __typename: 'Author',
            },
        };
        var mergedDataWithoutId = {
            author: {
                name: {
                    firstName: 'Jane',
                    lastName: 'Smith',
                },
                age: '124',
                __typename: 'Author',
            },
        };
        var store = createApolloStore({ config: { dataIdFromObject: dataIdFromObject } });
        var queryManager = createQueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: queryWithoutId },
                result: { data: dataWithoutId },
            }, {
                request: { query: queryWithId },
                result: { data: dataWithId },
            }),
            store: store,
        });
        var observableWithId = queryManager.watchQuery({ query: queryWithId });
        var observableWithoutId = queryManager.watchQuery({ query: queryWithoutId });
        return Promise.all([
            observableToPromise({ observable: observableWithoutId, wait: 120 }, function (result) { return assert.deepEqual(result.data, dataWithoutId); }, function (result) { return assert.deepEqual(result.data, mergedDataWithoutId); }),
            observableToPromise({ observable: observableWithId, wait: 120 }, function (result) { return assert.deepEqual(result.data, dataWithId); }),
        ]);
        var _a, _b;
    });
    describe('loading state', function () {
        it('should be passed as false if we are not watching a query', function () {
            var query = (_a = ["\n        query {\n          fortuneCookie\n        }"], _a.raw = ["\n        query {\n          fortuneCookie\n        }"], gql(_a));
            var data = {
                fortuneCookie: 'Buy it',
            };
            return mockQueryManager({
                request: { query: query },
                result: { data: data },
            }).query({ query: query }).then(function (result) {
                assert(!result.loading);
                assert.deepEqual(result.data, data);
            });
            var _a;
        });
        it('should be passed to the observer as false if we are returning all the data', function (done) {
            assertWithObserver({
                done: done,
                query: (_a = ["\n          query {\n            author {\n              firstName\n              lastName\n            }\n          }"], _a.raw = ["\n          query {\n            author {\n              firstName\n              lastName\n            }\n          }"], gql(_a)),
                result: {
                    data: {
                        author: {
                            firstName: 'John',
                            lastName: 'Smith',
                        },
                    },
                },
                observer: {
                    next: function (result) {
                        assert(!result.loading);
                        done();
                    },
                },
            });
            var _a;
        });
        it('will update on `resetStore`', function (done) {
            var testQuery = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var data1 = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var data2 = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith 2',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: testQuery },
                result: { data: data1 },
            }, {
                request: { query: testQuery },
                result: { data: data2 },
            });
            var count = 0;
            queryManager.watchQuery({
                query: testQuery,
                notifyOnNetworkStatusChange: false,
            }).subscribe({
                next: function (result) {
                    switch (count++) {
                        case 0:
                            assert.isFalse(result.loading);
                            assert.deepEqual(result.data, data1);
                            setTimeout(function () {
                                queryManager.resetStore();
                            }, 0);
                            break;
                        case 1:
                            assert.isFalse(result.loading);
                            assert.deepEqual(result.data, data2);
                            done();
                            break;
                        default:
                            done(new Error('`next` was called to many times.'));
                    }
                },
                error: function (error) { return done(error); },
            });
            var _a;
        });
    });
    describe('refetchQueries', function () {
        var oldWarn = console.warn;
        var warned;
        var timesWarned = 0;
        beforeEach(function (done) {
            warned = null;
            timesWarned = 0;
            console.warn = function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                warned = args;
                timesWarned++;
            };
            done();
        });
        it('should refetch the right query when a result is successfully returned', function () {
            var mutation = (_a = ["\n        mutation changeAuthorName {\n          changeAuthorName(newName: \"Jack Smith\") {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        mutation changeAuthorName {\n          changeAuthorName(newName: \"Jack Smith\") {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var mutationData = {
                changeAuthorName: {
                    firstName: 'Jack',
                    lastName: 'Smith',
                },
            };
            var query = (_b = ["\n        query getAuthors {\n          author {\n            firstName\n            lastName\n          }\n        }"], _b.raw = ["\n        query getAuthors {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_b));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var secondReqData = {
                author: {
                    firstName: 'Jane',
                    lastName: 'Johnson',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query },
                result: { data: data },
            }, {
                request: { query: query },
                result: { data: secondReqData },
            }, {
                request: { query: mutation },
                result: { data: mutationData },
            });
            var observable = queryManager.watchQuery({ query: query, notifyOnNetworkStatusChange: false });
            return observableToPromise({ observable: observable }, function (result) {
                assert.deepEqual(result.data, data);
                queryManager.mutate({ mutation: mutation, refetchQueries: ['getAuthors'] });
            }, function (result) { return assert.deepEqual(result.data, secondReqData); });
            var _a, _b;
        });
        it('should warn but continue when an unknown query name is asked to refetch', function () {
            var mutation = (_a = ["\n        mutation changeAuthorName {\n          changeAuthorName(newName: \"Jack Smith\") {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        mutation changeAuthorName {\n          changeAuthorName(newName: \"Jack Smith\") {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var mutationData = {
                changeAuthorName: {
                    firstName: 'Jack',
                    lastName: 'Smith',
                },
            };
            var query = (_b = ["\n        query getAuthors {\n          author {\n            firstName\n            lastName\n          }\n        }"], _b.raw = ["\n        query getAuthors {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_b));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var secondReqData = {
                author: {
                    firstName: 'Jane',
                    lastName: 'Johnson',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query },
                result: { data: data },
            }, {
                request: { query: query },
                result: { data: secondReqData },
            }, {
                request: { query: mutation },
                result: { data: mutationData },
            });
            var observable = queryManager.watchQuery({ query: query, notifyOnNetworkStatusChange: false });
            return observableToPromise({ observable: observable }, function (result) {
                assert.deepEqual(result.data, data);
                queryManager.mutate({ mutation: mutation, refetchQueries: ['fakeQuery', 'getAuthors'] });
            }, function (result) {
                assert.deepEqual(result.data, secondReqData);
                assert.include(warned[0], 'Warning: unknown query with name fakeQuery');
                assert.equal(timesWarned, 1);
            });
            var _a, _b;
        });
        it('should ignore without warning a query name that is asked to refetch with no active subscriptions', function () {
            var mutation = (_a = ["\n        mutation changeAuthorName {\n          changeAuthorName(newName: \"Jack Smith\") {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        mutation changeAuthorName {\n          changeAuthorName(newName: \"Jack Smith\") {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var mutationData = {
                changeAuthorName: {
                    firstName: 'Jack',
                    lastName: 'Smith',
                },
            };
            var query = (_b = ["\n        query getAuthors {\n          author {\n            firstName\n            lastName\n          }\n        }"], _b.raw = ["\n        query getAuthors {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_b));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var secondReqData = {
                author: {
                    firstName: 'Jane',
                    lastName: 'Johnson',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query },
                result: { data: data },
            }, {
                request: { query: query },
                result: { data: secondReqData },
            }, {
                request: { query: mutation },
                result: { data: mutationData },
            });
            var observable = queryManager.watchQuery({ query: query });
            return observableToPromise({ observable: observable }, function (result) {
                assert.deepEqual(result.data, data);
            }).then(function () {
                return queryManager.mutate({ mutation: mutation, refetchQueries: ['getAuthors'] });
            })
                .then(function () { return assert.equal(timesWarned, 0); });
            var _a, _b;
        });
        it('also works with a query document and variables', function () {
            var mutation = (_a = ["\n        mutation changeAuthorName {\n          changeAuthorName(newName: \"Jack Smith\") {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        mutation changeAuthorName {\n          changeAuthorName(newName: \"Jack Smith\") {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
            var mutationData = {
                changeAuthorName: {
                    firstName: 'Jack',
                    lastName: 'Smith',
                },
            };
            var query = (_b = ["\n        query getAuthors {\n          author {\n            firstName\n            lastName\n          }\n        }"], _b.raw = ["\n        query getAuthors {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_b));
            var data = {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            };
            var secondReqData = {
                author: {
                    firstName: 'Jane',
                    lastName: 'Johnson',
                },
            };
            var queryManager = mockQueryManager({
                request: { query: query },
                result: { data: data },
            }, {
                request: { query: query },
                result: { data: secondReqData },
            }, {
                request: { query: mutation },
                result: { data: mutationData },
            });
            var observable = queryManager.watchQuery({ query: query });
            return observableToPromise({ observable: observable }, function (result) {
                assert.deepEqual(result.data, data);
                queryManager.mutate({ mutation: mutation, refetchQueries: [{ query: query }] });
            }, function (result) { return assert.deepEqual(result.data, secondReqData); });
            var _a, _b;
        });
        afterEach(function (done) {
            console.warn = oldWarn;
            done();
        });
    });
    it('exposes errors on a refetch as a rejection', function (done) {
        var request = {
            query: (_a = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }"], _a.raw = ["\n      {\n        people_one(id: 1) {\n          name\n        }\n      }"], gql(_a)),
        };
        var firstResult = {
            data: {
                people_one: {
                    name: 'Luke Skywalker',
                },
            },
        };
        var secondResult = {
            errors: [
                {
                    name: 'PeopleError',
                    message: 'This is not the person you are looking for.',
                },
            ],
        };
        var queryManager = mockRefetch({ request: request, firstResult: firstResult, secondResult: secondResult });
        var handle = queryManager.watchQuery(request);
        handle.subscribe({
            error: function () { },
        });
        handle.refetch()
            .then(function () {
            done(new Error('Error on refetch should reject promise'));
        })
            .catch(function (error) {
            assert.deepEqual(error.graphQLErrors, [
                {
                    name: 'PeopleError',
                    message: 'This is not the person you are looking for.',
                },
            ]);
            done();
        });
        var _a;
    });
});
//# sourceMappingURL=QueryManager.js.map