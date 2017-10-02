import { QueryScheduler } from '../src/scheduler/scheduler';
import { assert } from 'chai';
import { QueryManager, } from '../src/core/QueryManager';
import { createApolloStore, } from '../src/store';
import mockNetworkInterface from './mocks/mockNetworkInterface';
import { NetworkStatus } from '../src/queries/networkStatus';
import gql from 'graphql-tag';
describe('QueryScheduler', function () {
    var defaultReduxRootSelector = function (state) { return state.apollo; };
    it('should throw an error if we try to start polling a non-polling query', function () {
        var queryManager = new QueryManager({
            networkInterface: mockNetworkInterface(),
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
            addTypename: false,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var queryOptions = {
            query: query,
        };
        assert.throws(function () {
            scheduler.startPollingQuery(queryOptions, null);
        });
        var _a;
    });
    it('should correctly start polling queries', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var queryOptions = {
            query: query,
            pollInterval: 80,
        };
        var networkInterface = mockNetworkInterface({
            request: queryOptions,
            result: { data: data },
        });
        var queryManager = new QueryManager({
            networkInterface: networkInterface,
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
            addTypename: false,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var timesFired = 0;
        var queryId = scheduler.startPollingQuery(queryOptions, 'fake-id', function (queryStoreValue) {
            timesFired += 1;
        });
        setTimeout(function () {
            assert.isAtLeast(timesFired, 0);
            scheduler.stopPollingQuery(queryId);
            done();
        }, 120);
        var _a;
    });
    it('should correctly stop polling queries', function (done) {
        var query = (_a = ["\n      query {\n        someAlias: author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        someAlias: author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            'someAlias': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var queryOptions = {
            query: query,
            pollInterval: 20,
        };
        var networkInterface = mockNetworkInterface({
            request: {
                query: queryOptions.query,
            },
            result: { data: data },
        });
        var queryManager = new QueryManager({
            networkInterface: networkInterface,
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var timesFired = 0;
        var queryId = scheduler.startPollingQuery(queryOptions, 'fake-id', function (queryStoreValue) {
            if (queryStoreValue.networkStatus !== NetworkStatus.poll) {
                timesFired += 1;
                scheduler.stopPollingQuery(queryId);
            }
        });
        setTimeout(function () {
            assert.equal(timesFired, 1);
            done();
        }, 170);
        var _a;
    });
    it('should register a query and return an observable that can be unsubscribed', function (done) {
        var myQuery = (_a = ["\n      query {\n        someAuthorAlias: author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        someAuthorAlias: author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            'someAuthorAlias': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var queryOptions = {
            query: myQuery,
            pollInterval: 20,
        };
        var networkInterface = mockNetworkInterface({
            request: queryOptions,
            result: { data: data },
        });
        var queryManager = new QueryManager({
            networkInterface: networkInterface,
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
            addTypename: false,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var timesFired = 0;
        var observableQuery = scheduler.registerPollingQuery(queryOptions);
        var subscription = observableQuery.subscribe({
            next: function (result) {
                timesFired += 1;
                assert.deepEqual(result.data, data);
                subscription.unsubscribe();
            },
        });
        setTimeout(function () {
            assert.equal(timesFired, 1);
            done();
        }, 100);
        var _a;
    });
    it('should handle network errors on polling queries correctly', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var error = new Error('something went terribly wrong');
        var queryOptions = {
            query: query,
            pollInterval: 80,
        };
        var networkInterface = mockNetworkInterface({
            request: queryOptions,
            error: error,
        });
        var queryManager = new QueryManager({
            networkInterface: networkInterface,
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var observableQuery = scheduler.registerPollingQuery(queryOptions);
        var subscription = observableQuery.subscribe({
            next: function (result) {
                done(new Error('Observer provided a result despite a network error.'));
            },
            error: function (errorVal) {
                assert(errorVal);
                subscription.unsubscribe();
                done();
            },
        });
        var _a;
    });
    it('should handle graphql errors on polling queries correctly', function (done) {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var errors = [new Error('oh no something went wrong')];
        var queryOptions = {
            query: query,
            pollInterval: 80,
        };
        var networkInterface = mockNetworkInterface({
            request: queryOptions,
            result: { errors: errors },
        });
        var queryManager = new QueryManager({
            networkInterface: networkInterface,
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var observableQuery = scheduler.registerPollingQuery(queryOptions);
        var subscription = observableQuery.subscribe({
            error: function (errorVal) {
                subscription.unsubscribe();
                assert(errorVal);
                done();
            },
        });
        var _a;
    });
    it('should not fire another query if one with the same id is in flight', function (done) {
        var query = (_a = ["\n      query B {\n        fortuneCookie\n      }"], _a.raw = ["\n      query B {\n        fortuneCookie\n      }"], gql(_a));
        var data = {
            'fortuneCookie': 'you will live a long life',
        };
        var queryOptions = {
            query: query,
            pollInterval: 10,
        };
        var networkInterface = mockNetworkInterface({
            request: queryOptions,
            result: { data: data },
            delay: 20000,
        });
        var queryManager = new QueryManager({
            networkInterface: networkInterface,
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var observer = scheduler.registerPollingQuery(queryOptions);
        var subscription = observer.subscribe({});
        setTimeout(function () {
            subscription.unsubscribe();
            done();
        }, 100);
        var _a;
    });
    it('should add a query to an interval correctly', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie\n      }"], _a.raw = ["\n      query {\n        fortuneCookie\n      }"], gql(_a));
        var data = {
            'fortuneCookie': 'live long and prosper',
        };
        var queryOptions = {
            query: query,
            pollInterval: 10000,
        };
        var networkInterface = mockNetworkInterface({
            request: queryOptions,
            result: { data: data },
        });
        var queryManager = new QueryManager({
            networkInterface: networkInterface,
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var queryId = 'fake-id';
        scheduler.addQueryOnInterval(queryId, queryOptions);
        assert.equal(Object.keys(scheduler.intervalQueries).length, 1);
        assert.equal(Object.keys(scheduler.intervalQueries)[0], queryOptions.pollInterval.toString());
        var queries = scheduler.intervalQueries[queryOptions.pollInterval.toString()];
        assert.equal(queries.length, 1);
        assert.equal(queries[0], queryId);
        var _a;
    });
    it('should add multiple queries to an interval correctly', function () {
        var query1 = (_a = ["\n      query {\n        fortuneCookie\n      }"], _a.raw = ["\n      query {\n        fortuneCookie\n      }"], gql(_a));
        var data1 = {
            'fortuneCookie': 'live long and prosper',
        };
        var query2 = (_b = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], _b.raw = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], gql(_b));
        var data2 = {
            author: {
                firstName: 'Dhaivat',
                lastName: 'Pandya',
            },
        };
        var interval = 20000;
        var queryOptions1 = {
            query: query1,
            pollInterval: interval,
        };
        var queryOptions2 = {
            query: query2,
            pollInterval: interval,
        };
        var queryManager = new QueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: query1 },
                result: { data: data1 },
            }, {
                request: { query: query2 },
                result: { data: data2 },
            }),
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
            addTypename: false,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var observable1 = scheduler.registerPollingQuery(queryOptions1);
        observable1.subscribe({
            next: function (result) {
            },
        });
        var observable2 = scheduler.registerPollingQuery(queryOptions2);
        observable2.subscribe({
            next: function (result) {
            },
        });
        var keys = Object.keys(scheduler.intervalQueries);
        assert.equal(keys.length, 1);
        assert.equal(keys[0], String(interval));
        var queryIds = scheduler.intervalQueries[keys[0]];
        assert.equal(queryIds.length, 2);
        assert.deepEqual(scheduler.registeredQueries[queryIds[0]], queryOptions1);
        assert.deepEqual(scheduler.registeredQueries[queryIds[1]], queryOptions2);
        var _a, _b;
    });
    it('should remove queries from the interval list correctly', function (done) {
        var query = (_a = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], _a.raw = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], gql(_a));
        var data = {
            author: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var queryManager = new QueryManager({
            networkInterface: mockNetworkInterface({
                request: { query: query },
                result: { data: data },
            }),
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
            addTypename: false,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var timesFired = 0;
        var observable = scheduler.registerPollingQuery({ query: query, pollInterval: 10 });
        var subscription = observable.subscribe({
            next: function (result) {
                timesFired += 1;
                assert.deepEqual(result.data, data);
                subscription.unsubscribe();
                assert.equal(Object.keys(scheduler.registeredQueries).length, 0);
            },
        });
        setTimeout(function () {
            assert.equal(timesFired, 1);
            done();
        }, 100);
        var _a;
    });
    it('should correctly start new polling query after removing old one', function (done) {
        var query = (_a = ["\n      query {\n        someAlias: author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        someAlias: author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            'someAlias': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var queryOptions = {
            query: query,
            pollInterval: 20,
        };
        var networkInterface = mockNetworkInterface({
            request: queryOptions,
            result: { data: data },
        });
        var queryManager = new QueryManager({
            networkInterface: networkInterface,
            store: createApolloStore(),
            reduxRootSelector: defaultReduxRootSelector,
            addTypename: false,
        });
        var scheduler = new QueryScheduler({
            queryManager: queryManager,
        });
        var timesFired = 0;
        var queryId = scheduler.startPollingQuery(queryOptions, 'fake-id', function (queryStoreValue) {
            scheduler.stopPollingQuery(queryId);
        });
        setTimeout(function () {
            var queryId2 = scheduler.startPollingQuery(queryOptions, 'fake-id2', function (queryStoreValue) {
                timesFired += 1;
            });
            assert.equal(scheduler.intervalQueries[20].length, 1);
            setTimeout(function () {
                assert.isAtLeast(timesFired, 1);
                scheduler.stopPollingQuery(queryId2);
                done();
            }, 300);
        }, 200);
        var _a;
    });
});
//# sourceMappingURL=scheduler.js.map