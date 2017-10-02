import * as chai from 'chai';
var assert = chai.assert;
import * as sinon from 'sinon';
import gql from 'graphql-tag';
import { QueryManager, } from '../src/core/QueryManager';
import { createApolloStore, } from '../src/store';
import ApolloClient from '../src/ApolloClient';
import mockQueryManager from './mocks/mockQueryManager';
import mockWatchQuery from './mocks/mockWatchQuery';
import mockNetworkInterface from './mocks/mockNetworkInterface';
import { IntrospectionFragmentMatcher, } from '../src/data/fragmentMatcher';
import wrap from './util/wrap';
import subscribeAndCount from './util/subscribeAndCount';
import { NetworkStatus } from '../src/queries/networkStatus';
describe('ObservableQuery', function () {
    var query = (_a = ["\n    query query($id: ID!) {\n      people_one(id: $id) {\n        name\n      }\n    }\n  "], _a.raw = ["\n    query query($id: ID!) {\n      people_one(id: $id) {\n        name\n      }\n    }\n  "], gql(_a));
    var superQuery = (_b = ["\n    query superQuery($id: ID!) {\n      people_one(id: $id) {\n        name\n        age\n      }\n    }\n  "], _b.raw = ["\n    query superQuery($id: ID!) {\n      people_one(id: $id) {\n        name\n        age\n      }\n    }\n  "], gql(_b));
    var variables = { id: 1 };
    var differentVariables = { id: 2 };
    var dataOne = {
        people_one: {
            name: 'Luke Skywalker',
        },
    };
    var superDataOne = {
        people_one: {
            name: 'Luke Skywalker',
            age: 21,
        },
    };
    var dataTwo = {
        people_one: {
            name: 'Leia Skywalker',
        },
    };
    var error = {
        name: 'people_one',
        message: 'is offline.',
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
    describe('setOptions', function () {
        describe('to change pollInterval', function () {
            var timer;
            var defer = setImmediate;
            beforeEach(function () { return timer = sinon.useFakeTimers(); });
            afterEach(function () { return timer.restore(); });
            it('starts polling if goes from 0 -> something', function (done) {
                var manager = mockQueryManager({
                    request: { query: query, variables: variables },
                    result: { data: dataOne },
                }, {
                    request: { query: query, variables: variables },
                    result: { data: dataTwo },
                });
                var observable = manager.watchQuery({ query: query, variables: variables, notifyOnNetworkStatusChange: false });
                subscribeAndCount(done, observable, function (handleCount, result) {
                    if (handleCount === 1) {
                        assert.deepEqual(result.data, dataOne);
                        observable.setOptions({ pollInterval: 10 });
                        timer.tick(11);
                    }
                    else if (handleCount === 2) {
                        assert.deepEqual(result.data, dataTwo);
                        done();
                    }
                });
                timer.tick(0);
            });
            it('stops polling if goes from something -> 0', function (done) {
                var manager = mockQueryManager({
                    request: { query: query, variables: variables },
                    result: { data: dataOne },
                }, {
                    request: { query: query, variables: variables },
                    result: { data: dataTwo },
                });
                var observable = manager.watchQuery({
                    query: query,
                    variables: variables,
                    pollInterval: 10,
                });
                subscribeAndCount(done, observable, function (handleCount, result) {
                    if (handleCount === 1) {
                        assert.deepEqual(result.data, dataOne);
                        observable.setOptions({ pollInterval: 0 });
                        timer.tick(100);
                        done();
                    }
                    else if (handleCount === 2) {
                        done(new Error('Should not get more than one result'));
                    }
                });
                timer.tick(0);
            });
            it('can change from x>0 to y>0', function (done) {
                var manager = mockQueryManager({
                    request: { query: query, variables: variables },
                    result: { data: dataOne },
                }, {
                    request: { query: query, variables: variables },
                    result: { data: dataTwo },
                });
                var observable = manager.watchQuery({
                    query: query,
                    variables: variables,
                    pollInterval: 100,
                    notifyOnNetworkStatusChange: false,
                });
                subscribeAndCount(done, observable, function (handleCount, result) {
                    if (handleCount === 1) {
                        assert.deepEqual(result.data, dataOne);
                        defer(function () {
                            observable.setOptions({ pollInterval: 10 });
                            defer(function () {
                                timer.tick(11);
                            });
                        });
                    }
                    else if (handleCount === 2) {
                        assert.deepEqual(result.data, dataTwo);
                        done();
                    }
                });
                timer.tick(0);
            });
        });
        it('does not break refetch', function (done) {
            var queryWithVars = (_a = ["query people($first: Int) {\n        allPeople(first: $first) { people { name } }\n      }"], _a.raw = ["query people($first: Int) {\n        allPeople(first: $first) { people { name } }\n      }"], gql(_a));
            var data = { allPeople: { people: [{ name: 'Luke Skywalker' }] } };
            var variables1 = { first: 0 };
            var data2 = { allPeople: { people: [{ name: 'Leia Skywalker' }] } };
            var variables2 = { first: 1 };
            var observable = mockWatchQuery({
                request: { query: queryWithVars, variables: variables1 },
                result: { data: data },
            }, {
                request: { query: queryWithVars, variables: variables2 },
                result: { data: data2 },
            });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, data);
                    observable.refetch(variables2);
                }
                else if (handleCount === 3) {
                    assert.deepEqual(result.data, data2);
                    done();
                }
            });
            var _a;
        });
        it('if query is refetched, and an error is returned, a second refetch without error will trigger the observer callback', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: variables },
                result: { errors: [error] },
            }, {
                request: { query: query, variables: variables },
                result: { data: dataOne },
            });
            var handleCount = 0;
            observable.subscribe({
                next: function (result) {
                    handleCount++;
                    if (handleCount === 1) {
                        assert.deepEqual(result.data, dataOne);
                        observable.refetch();
                    }
                    else if (handleCount === 3) {
                        assert.deepEqual(result.data, dataOne);
                        done();
                    }
                },
                error: function (err) {
                    handleCount++;
                    assert.equal(handleCount, 2);
                    observable.refetch();
                },
            });
        });
        it('does a network request if fetchPolicy becomes networkOnly', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: variables },
                result: { data: dataTwo },
            });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, dataOne);
                    observable.setOptions({ fetchPolicy: 'network-only' });
                }
                else if (handleCount === 2) {
                    assert.deepEqual(result.data, dataTwo);
                    done();
                }
            });
        });
        it('does a network request if fetchPolicy is cache-only then store is reset then fetchPolicy becomes not cache-only', function (done) {
            var queryManager;
            var observable;
            var testQuery = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
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
            observable = queryManager.watchQuery({ query: testQuery });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, data);
                    assert.equal(timesFired, 1);
                    setTimeout(function () {
                        observable.setOptions({ fetchPolicy: 'cache-only' });
                        queryManager.resetStore();
                    }, 0);
                }
                else if (handleCount === 2) {
                    assert.deepEqual(result.data, {});
                    assert.equal(timesFired, 1);
                    setTimeout(function () {
                        observable.setOptions({ fetchPolicy: 'cache-first' });
                    }, 0);
                }
                else if (handleCount === 3) {
                    assert.deepEqual(result.data, data);
                    assert.equal(timesFired, 2);
                    done();
                }
            });
            var _a;
        });
        it('does a network request if fetchPolicy changes from cache-only', function (done) {
            var queryManager;
            var observable;
            var testQuery = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
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
            observable = queryManager.watchQuery({ query: testQuery, fetchPolicy: 'cache-only', notifyOnNetworkStatusChange: false });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 2) {
                    assert.deepEqual(result.data, {});
                    assert.equal(timesFired, 0);
                    setTimeout(function () {
                        observable.setOptions({ fetchPolicy: 'cache-first' });
                    }, 0);
                }
                else if (handleCount === 3) {
                    assert.deepEqual(result.data, data);
                    assert.equal(timesFired, 1);
                    done();
                }
            });
            var _a;
        });
        it('can set queries to standby and will not fetch when doing so', function (done) {
            var queryManager;
            var observable;
            var testQuery = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
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
            observable = queryManager.watchQuery({
                query: testQuery,
                fetchPolicy: 'cache-first',
                notifyOnNetworkStatusChange: false,
            });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, data);
                    assert.equal(timesFired, 1);
                    setTimeout(function () {
                        observable.setOptions({ fetchPolicy: 'standby' });
                    }, 0);
                    setTimeout(function () {
                        assert.equal(timesFired, 1);
                        done();
                    }, 20);
                }
                else if (handleCount === 2) {
                    assert(false, 'Handle should not be triggered on standby query');
                }
            });
            var _a;
        });
        it('will not fetch when setting a cache-only query to standby', function (done) {
            var queryManager;
            var observable;
            var testQuery = (_a = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], _a.raw = ["\n        query {\n          author {\n            firstName\n            lastName\n          }\n        }"], gql(_a));
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
            queryManager.query({ query: testQuery }).then(function () {
                observable = queryManager.watchQuery({
                    query: testQuery,
                    fetchPolicy: 'cache-first',
                    notifyOnNetworkStatusChange: false,
                });
                subscribeAndCount(done, observable, function (handleCount, result) {
                    if (handleCount === 1) {
                        assert.deepEqual(result.data, data);
                        assert.equal(timesFired, 1);
                        setTimeout(function () {
                            observable.setOptions({ fetchPolicy: 'standby' });
                        }, 0);
                        setTimeout(function () {
                            assert.equal(timesFired, 1);
                            done();
                        }, 20);
                    }
                    else if (handleCount === 2) {
                        assert(false, 'Handle should not be triggered on standby query');
                    }
                });
            });
            var _a;
        });
        it('returns a promise which eventually returns data', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: variables },
                result: { data: dataTwo },
            });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount !== 1) {
                    return;
                }
                observable.setOptions({ fetchPolicy: 'cache-and-network', fetchResults: true })
                    .then(function (res) {
                    assert.deepEqual(res.data, dataOne);
                    done();
                });
            });
        });
        it('can bypass looking up results if passed to options', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: variables },
                result: { data: dataTwo },
            });
            var errored = false;
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    observable.setOptions({ fetchResults: false, fetchPolicy: 'standby' })
                        .then(function (res) {
                        assert.equal(res, null);
                        setTimeout(function () { return !errored && done(); }, 5);
                    });
                }
                else if (handleCount > 1) {
                    errored = true;
                    throw new Error('Handle should not be called twice');
                }
            });
        });
    });
    describe('setVariables', function () {
        it('reruns query if the variables change', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: differentVariables },
                result: { data: dataTwo },
            });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, dataOne);
                    observable.setVariables(differentVariables);
                }
                else if (handleCount === 2) {
                    assert.isTrue(result.loading);
                    assert.deepEqual(result.data, dataOne);
                }
                else if (handleCount === 3) {
                    assert.isFalse(result.loading);
                    assert.deepEqual(result.data, dataTwo);
                    done();
                }
            });
        });
        it('returns results that are frozen in development mode', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: differentVariables },
                result: { data: dataTwo },
            });
            var nop = function () { return 1; };
            var sub = observable.subscribe({ next: nop });
            observable.setVariables(differentVariables).then(function (result2) {
                assert.deepEqual(result2.data, dataTwo);
                try {
                    result2.data.stuff = 'awful';
                    done(new Error('results from setVariables should be frozen in development mode'));
                }
                catch (e) {
                    done();
                }
                finally {
                    sub.unsubscribe();
                }
            });
        });
        it('does not perform a query when unsubscribed if variables change', function () {
            var queryManager = mockQueryManager();
            var observable = queryManager.watchQuery({ query: query, variables: variables });
            return observable.setVariables(differentVariables);
        });
        it('sets networkStatus to `setVariables` when fetching', function (done) {
            var mockedResponses = [{
                    request: { query: query, variables: variables },
                    result: { data: dataOne },
                }, {
                    request: { query: query, variables: differentVariables },
                    result: { data: dataTwo },
                }];
            var queryManager = mockQueryManager.apply(void 0, mockedResponses);
            var firstRequest = mockedResponses[0].request;
            var observable = queryManager.watchQuery({
                query: firstRequest.query,
                variables: firstRequest.variables,
                notifyOnNetworkStatusChange: true,
            });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, dataOne);
                    assert.equal(result.networkStatus, NetworkStatus.ready);
                    observable.setVariables(differentVariables);
                }
                else if (handleCount === 2) {
                    assert.isTrue(result.loading);
                    assert.equal(result.networkStatus, NetworkStatus.setVariables);
                    assert.deepEqual(result.data, dataOne);
                }
                else if (handleCount === 3) {
                    assert.isFalse(result.loading);
                    assert.equal(result.networkStatus, NetworkStatus.ready);
                    assert.deepEqual(result.data, dataTwo);
                    done();
                }
            });
        });
        it('sets networkStatus to `setVariables` when calling refetch with new variables', function (done) {
            var mockedResponses = [{
                    request: { query: query, variables: variables },
                    result: { data: dataOne },
                }, {
                    request: { query: query, variables: differentVariables },
                    result: { data: dataTwo },
                }];
            var queryManager = mockQueryManager.apply(void 0, mockedResponses);
            var firstRequest = mockedResponses[0].request;
            var observable = queryManager.watchQuery({
                query: firstRequest.query,
                variables: firstRequest.variables,
                notifyOnNetworkStatusChange: true,
            });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, dataOne);
                    assert.equal(result.networkStatus, NetworkStatus.ready);
                    observable.refetch(differentVariables);
                }
                else if (handleCount === 2) {
                    assert.isTrue(result.loading);
                    assert.equal(result.networkStatus, NetworkStatus.setVariables);
                    assert.deepEqual(result.data, dataOne);
                }
                else if (handleCount === 3) {
                    assert.isFalse(result.loading);
                    assert.equal(result.networkStatus, NetworkStatus.ready);
                    assert.deepEqual(result.data, dataTwo);
                    done();
                }
            });
        });
        it('reruns observer callback if the variables change but data does not', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: differentVariables },
                result: { data: dataOne },
            });
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, dataOne);
                    observable.setVariables(differentVariables);
                }
                else if (handleCount === 2) {
                    assert.isTrue(result.loading);
                    assert.deepEqual(result.data, dataOne);
                }
                else if (handleCount === 3) {
                    assert.deepEqual(result.data, dataOne);
                    done();
                }
            });
        });
        it('does not rerun observer callback if the variables change but new data is in store', function (done) {
            var manager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: differentVariables },
                result: { data: dataOne },
            });
            manager.query({ query: query, variables: differentVariables })
                .then(function () {
                var observable = manager.watchQuery({
                    query: query,
                    variables: variables,
                    notifyOnNetworkStatusChange: false,
                });
                var errored = false;
                subscribeAndCount(done, observable, function (handleCount, result) {
                    if (handleCount === 1) {
                        assert.deepEqual(result.data, dataOne);
                        observable.setVariables(differentVariables);
                        setTimeout(function () { return !errored && done(); }, 10);
                    }
                    else if (handleCount === 2) {
                        errored = true;
                        throw new Error('Observable callback should not fire twice');
                    }
                });
            });
        });
        it('does not rerun query if variables do not change', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: variables },
                result: { data: dataTwo },
            });
            var errored = false;
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, dataOne);
                    observable.setVariables(variables);
                    setTimeout(function () { return !errored && done(); }, 10);
                }
                else if (handleCount === 2) {
                    errored = true;
                    throw new Error('Observable callback should not fire twice');
                }
            });
        });
        it('does not rerun query if set to not refetch', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: variables },
                result: { data: dataTwo },
            });
            var errored = false;
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, dataOne);
                    observable.setVariables(variables, true, false);
                    setTimeout(function () { return !errored && done(); }, 10);
                }
                else if (handleCount === 2) {
                    errored = true;
                    throw new Error('Observable callback should not fire twice');
                }
            });
        });
        it('handles variables changing while a query is in-flight', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
                delay: 20,
            }, {
                request: { query: query, variables: differentVariables },
                result: { data: dataTwo },
                delay: 20,
            });
            setTimeout(function () { return observable.setVariables(differentVariables); }, 10);
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.equal(result.networkStatus, NetworkStatus.ready);
                    assert.isFalse(result.loading);
                    assert.deepEqual(result.data, dataTwo);
                    done();
                }
            });
        });
    });
    describe('currentResult', function () {
        it('returns the same value as observableQuery.next got', function (done) {
            var queryWithFragment = (_a = ["\n        fragment MaleInfo on Man {\n          trouserSize\n          __typename\n        }\n\n        fragment FemaleInfo on Woman {\n          skirtSize\n          __typename\n        }\n\n        fragment PersonInfo on Person {\n          id\n          name\n          sex\n          ... on Man {\n              ...MaleInfo\n              __typename\n          }\n          ... on Woman {\n              ...FemaleInfo\n              __typename\n          }\n          __typename\n        }\n\n        {\n          people {\n            ...PersonInfo\n            __typename\n          }\n        }\n      "], _a.raw = ["\n        fragment MaleInfo on Man {\n          trouserSize\n          __typename\n        }\n\n        fragment FemaleInfo on Woman {\n          skirtSize\n          __typename\n        }\n\n        fragment PersonInfo on Person {\n          id\n          name\n          sex\n          ... on Man {\n              ...MaleInfo\n              __typename\n          }\n          ... on Woman {\n              ...FemaleInfo\n              __typename\n          }\n          __typename\n        }\n\n        {\n          people {\n            ...PersonInfo\n            __typename\n          }\n        }\n      "], gql(_a));
            var peopleData = [
                { id: 1, name: 'John Smith', sex: 'male', trouserSize: 6, __typename: 'Man' },
                { id: 2, name: 'Sara Smith', sex: 'female', skirtSize: 4, __typename: 'Woman' },
                { id: 3, name: 'Budd Deey', sex: 'male', trouserSize: 10, __typename: 'Man' },
            ];
            var dataOneWithTypename = {
                people: peopleData.slice(0, 2),
            };
            var dataTwoWithTypename = {
                people: peopleData.slice(0, 3),
            };
            var ni = mockNetworkInterface({
                request: { query: queryWithFragment, variables: variables },
                result: { data: dataOneWithTypename },
            }, {
                request: { query: queryWithFragment, variables: variables },
                result: { data: dataTwoWithTypename },
            });
            var client = new ApolloClient({
                networkInterface: ni,
                fragmentMatcher: new IntrospectionFragmentMatcher({
                    introspectionQueryResultData: {
                        __schema: {
                            types: [{
                                    kind: 'UNION',
                                    name: 'Creature',
                                    possibleTypes: [{ name: 'Person' }],
                                }],
                        },
                    },
                }),
            });
            var observable = client.watchQuery({ query: queryWithFragment, variables: variables, notifyOnNetworkStatusChange: true });
            subscribeAndCount(done, observable, function (count, result) {
                var _a = observable.currentResult(), data = _a.data, loading = _a.loading, networkStatus = _a.networkStatus;
                try {
                    assert.deepEqual(result, { data: data, loading: loading, networkStatus: networkStatus, stale: false });
                }
                catch (e) {
                    done(e);
                }
                if (count === 1) {
                    observable.refetch();
                }
                if (count === 3) {
                    setTimeout(done, 5);
                }
                if (count > 3) {
                    done(new Error('Observable.next called too many times'));
                }
            });
            var _a;
        });
        it('returns the current query status immediately', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
                delay: 100,
            });
            subscribeAndCount(done, observable, function () {
                assert.deepEqual(observable.currentResult(), {
                    data: dataOne,
                    loading: false,
                    networkStatus: 7,
                    partial: false,
                });
                done();
            });
            assert.deepEqual(observable.currentResult(), {
                loading: true,
                data: {},
                networkStatus: 1,
                partial: true,
            });
            setTimeout(wrap(done, function () {
                assert.deepEqual(observable.currentResult(), {
                    loading: true,
                    data: {},
                    networkStatus: 1,
                    partial: true,
                });
            }), 0);
        });
        it('returns results from the store immediately', function () {
            var queryManager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            });
            return queryManager.query({ query: query, variables: variables })
                .then(function (result) {
                assert.deepEqual(result, {
                    data: dataOne,
                    loading: false,
                    networkStatus: 7,
                    stale: false,
                });
                var observable = queryManager.watchQuery({
                    query: query,
                    variables: variables,
                });
                assert.deepEqual(observable.currentResult(), {
                    data: dataOne,
                    loading: false,
                    networkStatus: 7,
                    partial: false,
                });
            });
        });
        it('returns errors from the store immediately', function () {
            var queryManager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { errors: [error] },
            });
            var observable = queryManager.watchQuery({
                query: query,
                variables: variables,
            });
            return observable.result()
                .catch(function (theError) {
                assert.deepEqual(theError.graphQLErrors, [error]);
                var currentResult = observable.currentResult();
                assert.equal(currentResult.loading, false);
                assert.deepEqual(currentResult.error.graphQLErrors, [error]);
            });
        });
        it('returns loading even if full data is available when using network-only fetchPolicy', function (done) {
            var queryManager = mockQueryManager({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: variables },
                result: { data: dataTwo },
            });
            queryManager.query({ query: query, variables: variables })
                .then(function (result) {
                var observable = queryManager.watchQuery({
                    query: query,
                    variables: variables,
                    fetchPolicy: 'network-only',
                });
                assert.deepEqual(observable.currentResult(), {
                    data: dataOne,
                    loading: true,
                    networkStatus: 1,
                    partial: false,
                });
                subscribeAndCount(done, observable, function (handleCount, subResult) {
                    var _a = observable.currentResult(), data = _a.data, loading = _a.loading, networkStatus = _a.networkStatus;
                    assert.deepEqual(subResult, { data: data, loading: loading, networkStatus: networkStatus, stale: false });
                    if (handleCount === 1) {
                        assert.deepEqual(subResult, {
                            data: dataTwo,
                            loading: false,
                            networkStatus: 7,
                            stale: false,
                        });
                        done();
                    }
                });
            });
        });
        describe('mutations', function () {
            var mutation = (_a = ["\n        mutation setName {\n          name\n        }\n      "], _a.raw = ["\n        mutation setName {\n          name\n        }\n      "], gql(_a));
            var mutationData = {
                name: 'Leia Skywalker',
            };
            var optimisticResponse = {
                name: 'Leia Skywalker (optimistic)',
            };
            var updateQueries = {
                query: function (previousQueryResult, _a) {
                    var mutationResult = _a.mutationResult;
                    return {
                        people_one: { name: mutationResult.data.name },
                    };
                },
            };
            it('returns optimistic mutation results from the store', function (done) {
                var queryManager = mockQueryManager({
                    request: { query: query, variables: variables },
                    result: { data: dataOne },
                }, {
                    request: { query: mutation },
                    result: { data: mutationData },
                });
                var observable = queryManager.watchQuery({
                    query: query,
                    variables: variables,
                });
                subscribeAndCount(done, observable, function (count, result) {
                    var _a = observable.currentResult(), data = _a.data, loading = _a.loading, networkStatus = _a.networkStatus;
                    assert.deepEqual(result, { data: data, loading: loading, networkStatus: networkStatus, stale: false });
                    if (count === 1) {
                        assert.deepEqual(result, {
                            data: dataOne,
                            loading: false,
                            networkStatus: 7,
                            stale: false,
                        });
                        queryManager.mutate({ mutation: mutation, optimisticResponse: optimisticResponse, updateQueries: updateQueries });
                    }
                    else if (count === 2) {
                        assert.deepEqual(result.data.people_one, optimisticResponse);
                    }
                    else if (count === 3) {
                        assert.deepEqual(result.data.people_one, mutationData);
                        done();
                    }
                });
            });
            it('applies query reducers with correct variables', function (done) {
                var queryManager = mockQueryManager({
                    request: { query: query, variables: variables },
                    result: { data: dataOne },
                }, {
                    request: { query: mutation },
                    result: { data: mutationData },
                }, {
                    request: { query: query, variables: differentVariables },
                    result: { data: dataTwo },
                }, {
                    request: { query: mutation },
                    result: { data: mutationData },
                });
                var lastReducerVars = [];
                var lastReducerData = [];
                var observable = queryManager.watchQuery({
                    query: query,
                    variables: variables,
                    reducer: function (previous, action, reducerVars) {
                        if (action.type === 'APOLLO_MUTATION_RESULT') {
                            lastReducerData.push(previous);
                            lastReducerVars.push(reducerVars);
                        }
                        return previous;
                    },
                });
                function assertVariables() {
                    assert.lengthOf(lastReducerVars, 2);
                    assert.deepEqual(lastReducerVars[0], variables);
                    assert.deepEqual(lastReducerData[0], dataOne);
                    assert.deepEqual(lastReducerVars[1], differentVariables);
                    assert.deepEqual(lastReducerData[1], dataTwo);
                    done();
                }
                var sub = observable.subscribe({});
                queryManager.mutate({ mutation: mutation }).then(function () {
                    observable.setVariables(differentVariables);
                    queryManager.mutate({ mutation: mutation }).then(function () {
                        setTimeout(assertVariables, 0);
                    });
                });
            });
            var _a;
        });
    });
    describe('stopPolling', function () {
        var timer;
        var defer = setImmediate;
        beforeEach(function () { return timer = sinon.useFakeTimers(); });
        afterEach(function () { return timer.restore(); });
        it('does not restart polling after stopping and resubscribing', function (done) {
            var observable = mockWatchQuery({
                request: { query: query, variables: variables },
                result: { data: dataOne },
            }, {
                request: { query: query, variables: variables },
                result: { data: dataTwo },
            });
            observable.startPolling(100);
            observable.stopPolling();
            var startedPolling = false;
            subscribeAndCount(done, observable, function (handleCount, result) {
                if (handleCount === 1) {
                    timer.tick(101);
                    defer(function () {
                        if (!startedPolling) {
                            done();
                        }
                    });
                }
                else if (handleCount === 2) {
                    startedPolling = true;
                    done(new Error('should not start polling, already stopped'));
                }
            });
            timer.tick(0);
        });
    });
    var _a, _b;
});
//# sourceMappingURL=ObservableQuery.js.map