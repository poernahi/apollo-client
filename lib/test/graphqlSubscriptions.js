import { mockSubscriptionNetworkInterface, } from './mocks/mockNetworkInterface';
import { assert, } from 'chai';
import { cloneDeep } from 'lodash';
import { isSubscriptionResultAction } from '../src/actions';
import ApolloClient from '../src';
import gql from 'graphql-tag';
import { QueryManager, } from '../src/core/QueryManager';
import { createApolloStore, } from '../src/store';
describe('GraphQL Subscriptions', function () {
    var results = ['Dahivat Pandya', 'Vyacheslav Kim', 'Changping Chen', 'Amanda Liu'].map(function (name) { return ({ result: { data: { user: { name: name } } }, delay: 10 }); });
    var sub1;
    var options;
    var defaultOptions;
    var defaultSub1;
    beforeEach(function () {
        sub1 = {
            request: {
                query: (_a = ["\n          subscription UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], _a.raw = ["\n          subscription UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], gql(_a)),
                variables: {
                    name: 'Changping Chen',
                },
            },
            id: 0,
            results: results.slice(),
        };
        options = {
            query: (_b = ["\n        subscription UserInfo($name: String) {\n          user(name: $name) {\n            name\n          }\n        }\n      "], _b.raw = ["\n        subscription UserInfo($name: String) {\n          user(name: $name) {\n            name\n          }\n        }\n      "], gql(_b)),
            variables: {
                name: 'Changping Chen',
            },
        };
        defaultSub1 = {
            request: {
                query: (_c = ["\n          subscription UserInfo($name: String = \"Changping Chen\") {\n            user(name: $name) {\n              name\n            }\n          }\n        "], _c.raw = ["\n          subscription UserInfo($name: String = \"Changping Chen\") {\n            user(name: $name) {\n              name\n            }\n          }\n        "], gql(_c)),
                variables: {
                    name: 'Changping Chen',
                },
            },
            id: 0,
            results: results.slice(),
        };
        defaultOptions = {
            query: (_d = ["\n        subscription UserInfo($name: String = \"Changping Chen\") {\n          user(name: $name) {\n            name\n          }\n        }\n      "], _d.raw = ["\n        subscription UserInfo($name: String = \"Changping Chen\") {\n          user(name: $name) {\n            name\n          }\n        }\n      "], gql(_d)),
        };
        var _a, _b, _c, _d;
    });
    it('should start a subscription on network interface and unsubscribe', function (done) {
        var network = mockSubscriptionNetworkInterface([defaultSub1]);
        var client = new ApolloClient({
            networkInterface: network,
            addTypename: false,
        });
        var sub = client.subscribe(defaultOptions).subscribe({
            next: function (result) {
                assert.deepEqual(result, results[0].result.data);
                sub.unsubscribe();
                assert.equal(Object.keys(network.mockedSubscriptionsById).length, 0);
                done();
            },
        });
        var id = sub._networkSubscriptionId;
        network.fireResult(id);
        assert.equal(Object.keys(network.mockedSubscriptionsById).length, 1);
    });
    it('should subscribe with default values', function (done) {
        var network = mockSubscriptionNetworkInterface([sub1]);
        var client = new ApolloClient({
            networkInterface: network,
            addTypename: false,
        });
        var sub = client.subscribe(options).subscribe({
            next: function (result) {
                assert.deepEqual(result, results[0].result.data);
                sub.unsubscribe();
                assert.equal(Object.keys(network.mockedSubscriptionsById).length, 0);
                done();
            },
        });
        var id = sub._networkSubscriptionId;
        network.fireResult(id);
        assert.equal(Object.keys(network.mockedSubscriptionsById).length, 1);
    });
    it('should multiplex subscriptions', function (done) {
        var network = mockSubscriptionNetworkInterface([sub1]);
        var queryManager = new QueryManager({
            networkInterface: network,
            reduxRootSelector: function (state) { return state.apollo; },
            store: createApolloStore(),
            addTypename: false,
        });
        var obs = queryManager.startGraphQLSubscription(options);
        var counter = 0;
        var sub = obs.subscribe({
            next: function (result) {
                assert.deepEqual(result, results[0].result.data);
                counter++;
                if (counter === 2) {
                    done();
                }
            },
        });
        var resub = obs.subscribe({
            next: function (result) {
                assert.deepEqual(result, results[0].result.data);
                counter++;
                if (counter === 2) {
                    done();
                }
            },
        });
        var id = sub._networkSubscriptionId;
        network.fireResult(id);
    });
    it('should receive multiple results for a subscription', function (done) {
        var network = mockSubscriptionNetworkInterface([sub1]);
        var numResults = 0;
        var queryManager = new QueryManager({
            networkInterface: network,
            reduxRootSelector: function (state) { return state.apollo; },
            store: createApolloStore(),
            addTypename: false,
        });
        var sub = queryManager.startGraphQLSubscription(options).subscribe({
            next: function (result) {
                assert.deepEqual(result, results[numResults].result.data);
                numResults++;
                if (numResults === 4) {
                    done();
                }
            },
        });
        var id = sub._networkSubscriptionId;
        for (var i = 0; i < 4; i++) {
            network.fireResult(id);
        }
    });
    it('should fire redux action and call result reducers', function (done) {
        var query = (_a = ["\n      query miniQuery {\n        number\n      }\n    "], _a.raw = ["\n      query miniQuery {\n        number\n      }\n    "], gql(_a));
        var res = {
            data: {
                number: 0,
            },
        };
        var req1 = {
            request: { query: query },
            result: res,
        };
        var network = mockSubscriptionNetworkInterface([sub1], req1);
        var numResults = 0;
        var counter = 0;
        var queryManager = new QueryManager({
            networkInterface: network,
            reduxRootSelector: function (state) { return state.apollo; },
            store: createApolloStore(),
            addTypename: false,
        });
        var observableQuery = queryManager.watchQuery({
            query: query,
            reducer: function (previousResult, action) {
                counter++;
                if (isSubscriptionResultAction(action)) {
                    var newResult = cloneDeep(previousResult);
                    newResult.number++;
                    return newResult;
                }
                return previousResult;
            },
        }).subscribe({
            next: function () { return null; },
        });
        var sub = queryManager.startGraphQLSubscription(options).subscribe({
            next: function (result) {
                assert.deepEqual(result, results[numResults].result.data);
                numResults++;
                if (numResults === 4) {
                    observableQuery.unsubscribe();
                    assert.equal(counter, 5);
                    assert.equal(queryManager.store.getState()['apollo']['data']['ROOT_QUERY']['number'], 4);
                    done();
                }
            },
        });
        var id = sub._networkSubscriptionId;
        for (var i = 0; i < 4; i++) {
            network.fireResult(id);
        }
        var _a;
    });
});
//# sourceMappingURL=graphqlSubscriptions.js.map