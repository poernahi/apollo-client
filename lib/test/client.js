import * as chai from 'chai';
var assert = chai.assert;
import * as sinon from 'sinon';
import ApolloClient, { printAST, } from '../src';
import { disableFragmentWarnings as graphqlTagDisableFragmentWarnings, } from 'graphql-tag';
import { rootReducer as todosReducer, } from './fixtures/redux-todomvc';
import gql from 'graphql-tag';
import { print, } from 'graphql/language/printer';
import { createStore, combineReducers, applyMiddleware, } from 'redux';
import { QueryManager, } from '../src/core/QueryManager';
import { IntrospectionFragmentMatcher, } from '../src/data/fragmentMatcher';
import { createNetworkInterface, } from '../src/transport/networkInterface';
import { createBatchingNetworkInterface, } from '../src/transport/batchedNetworkInterface';
import mockNetworkInterface from './mocks/mockNetworkInterface';
import { mockObservableNetworkInterface } from './mocks/mockNetworkInterface';
import { createMockFetch, createMockedIResponse, } from './mocks/mockFetch';
import subscribeAndCount from './util/subscribeAndCount';
import * as chaiAsPromised from 'chai-as-promised';
import { withWarning } from './util/wrap';
import { cloneDeep, assign } from 'lodash';
chai.use(chaiAsPromised);
graphqlTagDisableFragmentWarnings();
describe('client', function () {
    it('does not require any arguments and creates store lazily', function () {
        var client = new ApolloClient();
        assert.isUndefined(client.store);
        client.initStore();
        assert.isDefined(client.store);
        assert.isDefined(client.store.getState().apollo);
    });
    it('can be loaded via require', function () {
        var ApolloClientRequire = require('../src').default;
        var client = new ApolloClientRequire();
        assert.isUndefined(client.store);
        client.initStore();
        assert.isDefined(client.store);
        assert.isDefined(client.store.getState().apollo);
    });
    it('can allow passing in a network interface', function () {
        var networkInterface = createNetworkInterface({ uri: 'swapi' });
        var client = new ApolloClient({
            networkInterface: networkInterface,
        });
        assert.equal(client.networkInterface._uri, networkInterface._uri);
    });
    it('can allow passing in a store', function () {
        var client = new ApolloClient();
        var store = createStore(combineReducers({
            todos: todosReducer,
            apollo: client.reducer(),
        }), applyMiddleware(client.middleware()));
        assert.deepEqual(client.store.getState(), store.getState());
    });
    it('throws an error if you pass in a store without apolloReducer', function () {
        try {
            var client = new ApolloClient();
            createStore(combineReducers({
                todos: todosReducer,
            }), applyMiddleware(client.middleware()));
            assert.fail();
        }
        catch (error) {
            assert.equal(error.message, 'Existing store does not use apolloReducer. Please make sure the store ' +
                'is properly configured and "reduxRootSelector" is correctly specified.');
        }
    });
    it('has a top level key by default', function () {
        var client = new ApolloClient();
        client.initStore();
        assert.deepEqual(client.store.getState(), {
            apollo: {
                data: {},
                optimistic: [],
                reducerError: null,
            },
        });
    });
    it('should allow passing in a selector function for apollo state', function () {
        var reduxRootSelector = function (state) { return state.testApollo; };
        var client = new ApolloClient({
            reduxRootSelector: reduxRootSelector,
        });
        createStore(combineReducers({
            testApollo: client.reducer(),
        }), applyMiddleware(client.middleware()));
    });
    it('should throw an error if "reduxRootSelector" is provided and the client tries to create the store', function () {
        var reduxRootSelector = function (state) { return state.testApollo; };
        var client = new ApolloClient({
            reduxRootSelector: reduxRootSelector,
        });
        try {
            client.initStore();
            assert.fail();
        }
        catch (error) {
            assert.equal(error.message, 'Cannot initialize the store because "reduxRootSelector" is provided. ' +
                'reduxRootSelector should only be used when the store is created outside of the client. ' +
                'This may lead to unexpected results when querying the store internally. ' +
                "Please remove that option from ApolloClient constructor.");
        }
    });
    it('should throw an error if query option is missing or not wrapped with a "gql" tag', function () {
        var client = new ApolloClient();
        assert.throws(function () {
            client.query((_a = ["{ a }"], _a.raw = ["{ a }"], gql(_a)));
            var _a;
        }, 'query option is required. You must specify your GraphQL document in the query option.');
        assert.throws(function () {
            client.query({ query: '{ a }' });
        }, 'You must wrap the query string in a "gql" tag.');
    });
    it('should throw an error if mutation option is missing', function () {
        var client = new ApolloClient();
        assert.throws(function () {
            client.mutate({ query: (_a = ["{ a }"], _a.raw = ["{ a }"], gql(_a)) });
            var _a;
        }, 'mutation option is required. You must specify your GraphQL document in the mutation option.');
    });
    it('should allow for a single query to take place', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n            __typename\n          }\n          __typename\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n            __typename\n          }\n          __typename\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                        __typename: 'Person',
                    },
                ],
                __typename: 'People',
            },
        };
        return clientRoundtrip(query, { data: data });
        var _a;
    });
    it('should allow a single query with an observable enabled network interface', function (done) {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n            __typename\n          }\n          __typename\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n            __typename\n          }\n          __typename\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                        __typename: 'Person',
                    },
                ],
                __typename: 'People',
            },
        };
        var variables = { first: 1 };
        var networkInterface = mockObservableNetworkInterface({
            request: { query: query, variables: variables },
            result: { data: data },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var basic = client.query({ query: query, variables: variables }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, data);
            done();
        });
        var _a;
    });
    it('should allow for a single query with complex default variables to take place', function () {
        var query = (_a = ["\n      query stuff($test: Input = {key1: [\"value\", \"value2\"], key2: {key3: 4}}) {\n        allStuff(test: $test) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query stuff($test: Input = {key1: [\"value\", \"value2\"], key2: {key3: 4}}) {\n        allStuff(test: $test) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var result = {
            allStuff: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                    {
                        name: 'Jabba The Hutt',
                    },
                ],
            },
        };
        var variables = { test: { key1: ['value', 'value2'], key2: { key3: 4 } } };
        var networkInterface = mockNetworkInterface({
            request: { query: query, variables: variables },
            result: { data: result },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var basic = client.query({ query: query, variables: variables }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var withDefault = client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        return Promise.all([basic, withDefault]);
        var _a;
    });
    it('should allow for a single query with default values that get overridden with variables', function () {
        var query = (_a = ["\n      query people($first: Int = 1) {\n        allPeople(first: $first) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people($first: Int = 1) {\n        allPeople(first: $first) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var variables = { first: 1 };
        var override = { first: 2 };
        var result = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var overriddenResult = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                    {
                        name: 'Jabba The Hutt',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query, variables: variables },
            result: { data: result },
        }, {
            request: { query: query, variables: override },
            result: { data: overriddenResult },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var basic = client.query({ query: query, variables: variables }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var withDefault = client.query({ query: query }).then(function (actualResult) {
            return assert.deepEqual(actualResult.data, result);
        });
        var withOverride = client.query({ query: query, variables: override }).then(function (actualResult) {
            return assert.deepEqual(actualResult.data, overriddenResult);
        });
        return Promise.all([basic, withDefault, withOverride]);
        var _a;
    });
    it('should allow fragments on root query', function () {
        var query = (_a = ["\n      query {\n        records {\n          id\n          __typename\n        }\n        ...QueryFragment\n      }\n\n      fragment QueryFragment on Query {\n        records {\n          name\n          __typename\n        }\n        __typename\n      }\n    "], _a.raw = ["\n      query {\n        records {\n          id\n          __typename\n        }\n        ...QueryFragment\n      }\n\n      fragment QueryFragment on Query {\n        records {\n          name\n          __typename\n        }\n        __typename\n      }\n    "], gql(_a));
        var data = {
            records: [
                { id: 1, name: 'One', __typename: 'Record' },
                { id: 2, name: 'Two', __typename: 'Record' },
            ],
            __typename: 'Query',
        };
        var ifm = new IntrospectionFragmentMatcher({
            introspectionQueryResultData: {
                __schema: {
                    types: [{
                            kind: 'UNION',
                            name: 'Query',
                            possibleTypes: [{
                                    name: 'Record',
                                }],
                        }],
                },
            },
        });
        return clientRoundtrip(query, { data: data }, null, ifm);
        var _a;
    });
    it('should allow for a single query with existing store', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: data },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        createStore(combineReducers({
            todos: todosReducer,
            apollo: client.reducer(),
        }), applyMiddleware(client.middleware()));
        return client.query({ query: query })
            .then(function (result) {
            assert.deepEqual(result.data, data);
        });
        var _a;
    });
    it('store can be rehydrated from the server', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: data },
        });
        var initialState = {
            apollo: {
                data: {
                    'ROOT_QUERY.allPeople({"first":"1"}).people.0': {
                        name: 'Luke Skywalker',
                    },
                    'ROOT_QUERY.allPeople({"first":1})': {
                        people: [{
                                type: 'id',
                                generated: true,
                                id: 'ROOT_QUERY.allPeople({"first":"1"}).people.0',
                            }],
                    },
                    ROOT_QUERY: {
                        'allPeople({"first":1})': {
                            type: 'id',
                            id: 'ROOT_QUERY.allPeople({"first":1})',
                            generated: true,
                        },
                    },
                },
                optimistic: [],
            },
        };
        var finalState = { apollo: assign({}, initialState.apollo, {
                reducerError: null,
            }) };
        var client = new ApolloClient({
            networkInterface: networkInterface,
            initialState: initialState,
            addTypename: false,
        });
        return client.query({ query: query })
            .then(function (result) {
            assert.deepEqual(result.data, data);
            assert.deepEqual(finalState, client.store.getState());
        });
        var _a;
    });
    it('allows for a single query with existing store and custom key', function () {
        var reduxRootSelector = function (store) { return store['test']; };
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: data },
        });
        var client = new ApolloClient({
            reduxRootSelector: reduxRootSelector,
            networkInterface: networkInterface,
            addTypename: false,
        });
        createStore(combineReducers({
            todos: todosReducer,
            test: client.reducer(),
        }), applyMiddleware(client.middleware()));
        return client.query({ query: query })
            .then(function (result) {
            assert.deepEqual(result.data, data);
        });
        var _a;
    });
    it('should return errors correctly for a single query', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var errors = [
            {
                name: 'test',
                message: 'Syntax Error GraphQL request (8:9) Expected Name, found EOF',
            },
        ];
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { errors: errors },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.query({ query: query })
            .catch(function (error) {
            assert.deepEqual(error.graphQLErrors, errors);
        });
        var _a;
    });
    it('should return GraphQL errors correctly for a single query with an observable enabled network interface', function (done) {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var errors = [
            {
                name: 'test',
                message: 'Syntax Error GraphQL request (8:9) Expected Name, found EOF',
            },
        ];
        var networkInterface = mockObservableNetworkInterface({
            request: { query: query },
            result: { errors: errors },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        client.query({ query: query })
            .catch(function (error) {
            assert.deepEqual(error.graphQLErrors, errors);
            done();
        });
        var _a;
    });
    it('should pass a network error correctly on a query with observable network interface', function (done) {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var data = {
            person: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var networkError = new Error('Some kind of network error.');
        var networkInterface = mockObservableNetworkInterface({
            request: { query: query },
            result: { data: data },
            error: networkError,
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        client.query({ query: query })
            .catch(function (error) {
            assert(error.networkError);
            assert.deepEqual(error.networkError.message, networkError.message);
            done();
        });
        var _a;
    });
    it('should surface errors in observer.next as uncaught', function (done) {
        var expectedError = new Error('this error should not reach the store');
        var listeners = process.listeners('uncaughtException');
        var oldHandler = listeners[listeners.length - 1];
        var handleUncaught = function (e) {
            process.removeListener('uncaughtException', handleUncaught);
            process.addListener('uncaughtException', oldHandler);
            if (e === expectedError) {
                done();
            }
            else {
                done(e);
            }
        };
        process.removeListener('uncaughtException', oldHandler);
        process.addListener('uncaughtException', handleUncaught);
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: data },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var handle = client.watchQuery({ query: query });
        handle.subscribe({
            next: function (result) {
                throw expectedError;
            },
        });
        var _a;
    });
    it('should surfaces errors in observer.error as uncaught', function (done) {
        var expectedError = new Error('this error should not reach the store');
        var listeners = process.listeners('uncaughtException');
        var oldHandler = listeners[listeners.length - 1];
        var handleUncaught = function (e) {
            process.removeListener('uncaughtException', handleUncaught);
            process.addListener('uncaughtException', oldHandler);
            if (e === expectedError) {
                done();
            }
            else {
                done(e);
            }
        };
        process.removeListener('uncaughtException', oldHandler);
        process.addListener('uncaughtException', handleUncaught);
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: {},
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var handle = client.watchQuery({ query: query });
        handle.subscribe({
            next: function () {
                done(new Error('did not expect next to be called'));
            },
            error: function (err) {
                throw expectedError;
            },
        });
        var _a;
    });
    it('should allow for subscribing to a request', function (done) {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: data },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var handle = client.watchQuery({ query: query });
        handle.subscribe({
            next: function (result) {
                assert.deepEqual(result.data, data);
                done();
            },
        });
        var _a;
    });
    it('should be able to transform queries', function () {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var transformedQuery = (_b = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], _b.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], gql(_b));
        var result = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var transformedResult = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
                '__typename': 'Author',
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: result },
        }, {
            request: { query: transformedQuery },
            result: { data: transformedResult },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: true,
        });
        return client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, transformedResult);
        });
        var _a, _b;
    });
    it('should be able to transform queries on network-only fetches', function () {
        var query = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var transformedQuery = (_b = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], _b.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n          __typename\n        }\n      }"], gql(_b));
        var result = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var transformedResult = {
            'author': {
                'firstName': 'John',
                'lastName': 'Smith',
                '__typename': 'Author',
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: result },
        }, {
            request: { query: transformedQuery },
            result: { data: transformedResult },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: true,
        });
        return client.query({ fetchPolicy: 'network-only', query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, transformedResult);
        });
        var _a, _b;
    });
    it('should handle named fragments on mutations', function () {
        var mutation = (_a = ["\n      mutation {\n        starAuthor(id: 12) {\n          author {\n            __typename\n            ...authorDetails\n          }\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }"], _a.raw = ["\n      mutation {\n        starAuthor(id: 12) {\n          author {\n            __typename\n            ...authorDetails\n          }\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }"], gql(_a));
        var result = {
            'starAuthor': {
                'author': {
                    __typename: 'Author',
                    'firstName': 'John',
                    'lastName': 'Smith',
                },
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: mutation },
            result: { data: result },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.mutate({ mutation: mutation }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a;
    });
    it('should be able to handle named fragments on network-only queries', function () {
        var query = (_a = ["\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }\n      query {\n        author {\n          __typename\n          ...authorDetails\n        }\n      }"], _a.raw = ["\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }\n      query {\n        author {\n          __typename\n          ...authorDetails\n        }\n      }"], gql(_a));
        var result = {
            'author': {
                __typename: 'Author',
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: result },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.query({ fetchPolicy: 'network-only', query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a;
    });
    it('should be able to handle named fragments with multiple fragments', function () {
        var query = (_a = ["\n      query {\n        author {\n          __typename\n          ...authorDetails\n          ...moreDetails\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }\n      fragment moreDetails on Author {\n        address\n      }"], _a.raw = ["\n      query {\n        author {\n          __typename\n          ...authorDetails\n          ...moreDetails\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }\n      fragment moreDetails on Author {\n        address\n      }"], gql(_a));
        var result = {
            'author': {
                __typename: 'Author',
                'firstName': 'John',
                'lastName': 'Smith',
                'address': '1337 10th St.',
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: result },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a;
    });
    it('should be able to handle named fragments', function () {
        var query = (_a = ["\n      query {\n        author {\n          __typename\n          ...authorDetails\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }"], _a.raw = ["\n      query {\n        author {\n          __typename\n          ...authorDetails\n        }\n      }\n      fragment authorDetails on Author {\n        firstName\n        lastName\n      }"], gql(_a));
        var result = {
            'author': {
                __typename: 'Author',
                'firstName': 'John',
                'lastName': 'Smith',
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: result },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a;
    });
    it('should be able to handle inlined fragments on an Interface type', function () {
        var query = (_a = ["\n      query items {\n        items {\n          ...ItemFragment\n          __typename\n        }\n      }\n\n      fragment ItemFragment on Item {\n        id\n        __typename\n        ... on ColorItem {\n          color\n          __typename\n        }\n      }"], _a.raw = ["\n      query items {\n        items {\n          ...ItemFragment\n          __typename\n        }\n      }\n\n      fragment ItemFragment on Item {\n        id\n        __typename\n        ... on ColorItem {\n          color\n          __typename\n        }\n      }"], gql(_a));
        var result = {
            'items': [
                {
                    '__typename': 'ColorItem',
                    'id': '27tlpoPeXm6odAxj3paGQP',
                    'color': 'red',
                },
                {
                    '__typename': 'MonochromeItem',
                    'id': '1t3iFLsHBm4c4RjOMdMgOO',
                },
            ],
        };
        var fancyFragmentMatcher = function (idValue, typeCondition, context) {
            var obj = context.store[idValue.id];
            if (!obj) {
                return false;
            }
            var implementingTypesMap = {
                'Item': ['ColorItem', 'MonochromeItem'],
            };
            if (obj.__typename === typeCondition) {
                return true;
            }
            var implementingTypes = implementingTypesMap[typeCondition];
            if (implementingTypes && implementingTypes.indexOf(obj.__typename) > -1) {
                return true;
            }
            return false;
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: result },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            fragmentMatcher: {
                match: fancyFragmentMatcher,
            },
        });
        return client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a;
    });
    it('should be able to handle inlined fragments on an Interface type with introspection fragment matcher', function () {
        var query = (_a = ["\n      query items {\n        items {\n          ...ItemFragment\n          __typename\n        }\n      }\n\n      fragment ItemFragment on Item {\n        id\n        ... on ColorItem {\n          color\n          __typename\n        }\n        __typename\n      }"], _a.raw = ["\n      query items {\n        items {\n          ...ItemFragment\n          __typename\n        }\n      }\n\n      fragment ItemFragment on Item {\n        id\n        ... on ColorItem {\n          color\n          __typename\n        }\n        __typename\n      }"], gql(_a));
        var result = {
            'items': [
                {
                    '__typename': 'ColorItem',
                    'id': '27tlpoPeXm6odAxj3paGQP',
                    'color': 'red',
                },
                {
                    '__typename': 'MonochromeItem',
                    'id': '1t3iFLsHBm4c4RjOMdMgOO',
                },
            ],
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: result },
        });
        var ifm = new IntrospectionFragmentMatcher({
            introspectionQueryResultData: {
                __schema: {
                    types: [{
                            kind: 'UNION',
                            name: 'Item',
                            possibleTypes: [{
                                    name: 'ColorItem',
                                }, {
                                    name: 'MonochromeItem',
                                }],
                        }],
                },
            },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            fragmentMatcher: ifm,
        });
        return client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a;
    });
    it('should call updateQueries, update and reducer after mutation on query with inlined fragments on an Interface type', function (done) {
        var query = (_a = ["\n      query items {\n        items {\n          ...ItemFragment\n          __typename\n        }\n      }\n\n      fragment ItemFragment on Item {\n        id\n        ... on ColorItem {\n          color\n          __typename\n        }\n        __typename\n      }"], _a.raw = ["\n      query items {\n        items {\n          ...ItemFragment\n          __typename\n        }\n      }\n\n      fragment ItemFragment on Item {\n        id\n        ... on ColorItem {\n          color\n          __typename\n        }\n        __typename\n      }"], gql(_a));
        var result = {
            'items': [
                {
                    '__typename': 'ColorItem',
                    'id': '27tlpoPeXm6odAxj3paGQP',
                    'color': 'red',
                },
                {
                    '__typename': 'MonochromeItem',
                    'id': '1t3iFLsHBm4c4RjOMdMgOO',
                },
            ],
        };
        var mutation = (_b = ["\n      mutation myMutationName {\n        fortuneCookie\n      }"], _b.raw = ["\n      mutation myMutationName {\n        fortuneCookie\n      }"], gql(_b));
        var mutationResult = {
            'fortuneCookie': 'The waiter spit in your food',
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { data: result },
        }, {
            request: { query: mutation },
            result: { data: mutationResult },
        });
        var ifm = new IntrospectionFragmentMatcher({
            introspectionQueryResultData: {
                __schema: {
                    types: [{
                            kind: 'UNION',
                            name: 'Item',
                            possibleTypes: [{
                                    name: 'ColorItem',
                                }, {
                                    name: 'MonochromeItem',
                                }],
                        }],
                },
            },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            fragmentMatcher: ifm,
        });
        var reducerSpy = sinon.spy();
        var reducer = function (prev, action) {
            reducerSpy();
            return prev;
        };
        var queryUpdaterSpy = sinon.spy();
        var queryUpdater = function (prev) {
            queryUpdaterSpy();
            return prev;
        };
        var updateQueries = {
            'items': queryUpdater,
        };
        var updateSpy = sinon.spy();
        var obs = client.watchQuery({ query: query, reducer: reducer });
        var sub = obs.subscribe({
            next: function () {
                client.mutate({ mutation: mutation, updateQueries: updateQueries, update: updateSpy })
                    .then(function () {
                    assert.isTrue(reducerSpy.called);
                    assert.isTrue(queryUpdaterSpy.called);
                    assert.isTrue(updateSpy.called);
                    sub.unsubscribe();
                    done();
                })
                    .catch(function (err) { done(err); });
            },
            error: function (err) {
                done(err);
            },
        });
        var _a, _b;
    });
    it('should send operationName along with the query to the server', function () {
        var query = (_a = ["\n      query myQueryName {\n        fortuneCookie\n      }"], _a.raw = ["\n      query myQueryName {\n        fortuneCookie\n      }"], gql(_a));
        var data = {
            'fortuneCookie': 'The waiter spit in your food',
        };
        var networkInterface = {
            query: function (request) {
                assert.equal(request.operationName, 'myQueryName');
                return Promise.resolve({ data: data });
            },
        };
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, data);
        });
        var _a;
    });
    it('should send operationName along with the mutation to the server', function () {
        var mutation = (_a = ["\n      mutation myMutationName {\n        fortuneCookie\n      }"], _a.raw = ["\n      mutation myMutationName {\n        fortuneCookie\n      }"], gql(_a));
        var data = {
            'fortuneCookie': 'The waiter spit in your food',
        };
        var networkInterface = {
            query: function (request) {
                assert.equal(request.operationName, 'myMutationName');
                return Promise.resolve({ data: data });
            },
        };
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        return client.mutate({ mutation: mutation }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, data);
        });
        var _a;
    });
    it('does not deduplicate queries if option is set to false', function () {
        var queryDoc = (_a = ["\n      query {\n        author {\n          name\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          name\n        }\n      }"], gql(_a));
        var data = {
            author: {
                name: 'Jonas',
            },
        };
        var data2 = {
            author: {
                name: 'Dhaivat',
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: queryDoc },
            result: { data: data },
            delay: 10,
        }, {
            request: { query: queryDoc },
            result: { data: data2 },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
            queryDeduplication: false,
        });
        var q1 = client.query({ query: queryDoc });
        var q2 = client.query({ query: queryDoc });
        return Promise.all([q1, q2]).then(function (_a) {
            var result1 = _a[0], result2 = _a[1];
            assert.deepEqual(result1.data, data);
            assert.deepEqual(result2.data, data2);
        });
        var _a;
    });
    it('deduplicates queries by default', function () {
        var queryDoc = (_a = ["\n      query {\n        author {\n          name\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          name\n        }\n      }"], gql(_a));
        var data = {
            author: {
                name: 'Jonas',
            },
        };
        var data2 = {
            author: {
                name: 'Dhaivat',
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: queryDoc },
            result: { data: data },
            delay: 10,
        }, {
            request: { query: queryDoc },
            result: { data: data2 },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var q1 = client.query({ query: queryDoc });
        var q2 = client.query({ query: queryDoc });
        return Promise.all([q1, q2]).then(function (_a) {
            var result1 = _a[0], result2 = _a[1];
            assert.deepEqual(result1.data, result2.data);
        });
        var _a;
    });
    it('emits Redux actions when the flag is enabled', function () {
        QueryManager.EMIT_REDUX_ACTIONS = true;
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n            __typename\n          }\n          __typename\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n            __typename\n          }\n          __typename\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                        __typename: 'Person',
                    },
                ],
                __typename: 'People',
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: cloneDeep(query) },
            result: { data: data },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
        });
        client.initStore();
        var orig = client.store.dispatch;
        var actionEmitted = false;
        client.store.dispatch = function (action) {
            if (action.type === 'APOLLO_QUERY_INIT') {
                actionEmitted = true;
            }
            orig(action);
        };
        var queryPromise = client.query({ query: query }).then(function (result) {
            assert.deepEqual(result.data, data);
        });
        QueryManager.EMIT_REDUX_ACTIONS = false;
        return queryPromise.then(function () {
            assert(actionEmitted, 'An action was not emitted');
        });
        var _a;
    });
    describe('deprecated options', function () {
        var query = (_a = ["\n      query people {\n        name\n      }\n    "], _a.raw = ["\n      query people {\n        name\n      }\n    "], gql(_a));
        it('errors when returnPartialData is used on query', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.query({ query: query, returnPartialData: true });
            }, /returnPartialData/);
        });
        it('errors when noFetch is used on query', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.query({ query: query, noFetch: true });
            }, /noFetch/);
        });
        it('errors when forceFetch is used on query', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.query({ query: query, forceFetch: true });
            }, /forceFetch/);
        });
        it('errors when returnPartialData is used on watchQuery', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.query({ query: query, returnPartialData: true });
            }, /returnPartialData/);
        });
        it('errors when noFetch is used on watchQuery', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.query({ query: query, noFetch: true });
            }, /noFetch/);
        });
        it('errors when forceFetch is used on watchQuery', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.query({ query: query, forceFetch: true });
            }, /forceFetch/);
        });
        var _a;
    });
    describe('accepts dataIdFromObject option', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            id\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            id\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        id: '1',
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        it('for internal store', function () {
            var networkInterface = mockNetworkInterface({
                request: { query: query },
                result: { data: data },
            });
            var client = new ApolloClient({
                networkInterface: networkInterface,
                dataIdFromObject: function (obj) { return obj.id; },
                addTypename: false,
            });
            return client.query({ query: query })
                .then(function (result) {
                assert.deepEqual(result.data, data);
                assert.deepEqual(client.store.getState()['apollo'].data['1'], {
                    id: '1',
                    name: 'Luke Skywalker',
                });
            });
        });
        it('for existing store', function () {
            var networkInterface = mockNetworkInterface({
                request: { query: query },
                result: { data: data },
            });
            var client = new ApolloClient({
                networkInterface: networkInterface,
                dataIdFromObject: function (obj) { return obj.id; },
                addTypename: false,
            });
            var store = createStore(combineReducers({
                apollo: client.reducer(),
            }), applyMiddleware(client.middleware()));
            return client.query({ query: query })
                .then(function (result) {
                assert.deepEqual(result.data, data);
                assert.deepEqual(store.getState()['apollo'].data['1'], {
                    id: '1',
                    name: 'Luke Skywalker',
                });
            });
        });
        var _a;
    });
    describe('cache-and-network fetchPolicy', function () {
        var query = (_a = ["\n      query number {\n        myNumber {\n          n\n        }\n      }\n    "], _a.raw = ["\n      query number {\n        myNumber {\n          n\n        }\n      }\n    "], gql(_a));
        var initialData = {
            myNumber: {
                n: 1,
            },
        };
        var networkFetch = {
            myNumber: {
                n: 2,
            },
        };
        it('errors when being used on query', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                client.query({ query: query, fetchPolicy: 'cache-and-network' });
            });
        });
        it('fetches from cache first, then network', function (done) {
            var networkInterface = mockNetworkInterface({
                request: { query: query },
                result: { data: networkFetch },
            });
            var client = new ApolloClient({
                networkInterface: networkInterface,
                addTypename: false,
            });
            client.writeQuery({
                query: query,
                data: initialData,
            });
            var obs = client.watchQuery({ query: query, fetchPolicy: 'cache-and-network' });
            subscribeAndCount(done, obs, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, initialData);
                }
                else if (handleCount === 2) {
                    assert.deepEqual(result.data, networkFetch);
                    done();
                }
            });
        });
        it('does not fail if cache entry is not present', function (done) {
            var networkInterface = mockNetworkInterface({
                request: { query: query },
                result: { data: networkFetch },
            });
            var client = new ApolloClient({
                networkInterface: networkInterface,
                addTypename: false,
            });
            var obs = client.watchQuery({ query: query, fetchPolicy: 'cache-and-network' });
            subscribeAndCount(done, obs, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.equal(result.data, undefined);
                    assert(result.loading);
                }
                else if (handleCount === 2) {
                    assert.deepEqual(result.data, networkFetch);
                    assert(!result.loading);
                    done();
                }
            });
        });
        it('fails if network request fails', function (done) {
            var networkInterface = mockNetworkInterface();
            var client = new ApolloClient({
                networkInterface: networkInterface,
                addTypename: false,
            });
            var obs = client.watchQuery({ query: query, fetchPolicy: 'cache-and-network' });
            var count = 0;
            obs.subscribe({
                next: function (result) {
                    assert.equal(result.data, undefined);
                    assert(result.loading);
                    count++;
                },
                error: function (e) {
                    assert.match(e.message, /No more mocked responses/);
                    assert.equal(count, 1);
                    done();
                },
            });
        });
        var _a;
    });
    describe('standby queries', function () {
        it('cannot be started with watchQuery or query', function () {
            var client = new ApolloClient();
            assert.throws(function () {
                return client.watchQuery({ query: (_a = ["{ abc }"], _a.raw = ["{ abc }"], gql(_a)), fetchPolicy: 'standby' });
                var _a;
            }, 'client.watchQuery cannot be called with fetchPolicy set to "standby"');
        });
        it('are not watching the store or notifying on updates', function (done) {
            var query = (_a = ["{ test }"], _a.raw = ["{ test }"], gql(_a));
            var data = { test: 'ok' };
            var data2 = { test: 'not ok' };
            var networkInterface = mockNetworkInterface({
                request: { query: query },
                result: { data: data },
            });
            var client = new ApolloClient({ networkInterface: networkInterface });
            var obs = client.watchQuery({ query: query, fetchPolicy: 'cache-first' });
            var handleCalled = false;
            subscribeAndCount(done, obs, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, data);
                    obs.setOptions({ fetchPolicy: 'standby' }).then(function () {
                        client.writeQuery({ query: query, data: data2 });
                    });
                    setTimeout(function () {
                        if (!handleCalled) {
                            done();
                        }
                    }, 20);
                }
                if (handleCount === 2) {
                    handleCalled = true;
                    done(new Error('Handle should never be called on standby query'));
                }
            });
            var _a;
        });
        it('return the current result when coming out of standby', function (done) {
            var query = (_a = ["{ test }"], _a.raw = ["{ test }"], gql(_a));
            var data = { test: 'ok' };
            var data2 = { test: 'not ok' };
            var networkInterface = mockNetworkInterface({
                request: { query: query },
                result: { data: data },
            });
            var client = new ApolloClient({ networkInterface: networkInterface });
            var obs = client.watchQuery({ query: query, fetchPolicy: 'cache-first' });
            var handleCalled = false;
            subscribeAndCount(done, obs, function (handleCount, result) {
                if (handleCount === 1) {
                    assert.deepEqual(result.data, data);
                    obs.setOptions({ fetchPolicy: 'standby' }).then(function () {
                        client.writeQuery({ query: query, data: data2 });
                        setTimeout(function () {
                            obs.setOptions({ fetchPolicy: 'cache-first' });
                        }, 10);
                    });
                }
                if (handleCount === 2) {
                    handleCalled = true;
                    assert.deepEqual(result.data, data2);
                    done();
                }
            });
            var _a;
        });
    });
    describe('network-only fetchPolicy', function () {
        var query = (_a = ["\n      query number {\n        myNumber {\n          n\n        }\n      }\n    "], _a.raw = ["\n      query number {\n        myNumber {\n          n\n        }\n      }\n    "], gql(_a));
        var firstFetch = {
            myNumber: {
                n: 1,
            },
        };
        var secondFetch = {
            myNumber: {
                n: 2,
            },
        };
        var networkInterface;
        var clock;
        beforeEach(function () {
            networkInterface = mockNetworkInterface({
                request: { query: query },
                result: { data: firstFetch },
            }, {
                request: { query: query },
                result: { data: secondFetch },
            });
        });
        afterEach(function () {
            if (clock) {
                clock.restore();
            }
        });
        it('forces the query to rerun', function () {
            var client = new ApolloClient({
                networkInterface: networkInterface,
                addTypename: false,
            });
            return client.query({ query: query })
                .then(function () { return client.query({ query: query, fetchPolicy: 'network-only' }); })
                .then(function (result) {
                assert.deepEqual(result.data, { myNumber: { n: 2 } });
            });
        });
        it('can be disabled with ssrMode', function () {
            var client = new ApolloClient({
                networkInterface: networkInterface,
                ssrMode: true,
                addTypename: false,
            });
            var options = { query: query, fetchPolicy: 'network-only' };
            return client.query({ query: query })
                .then(function () { return client.query(options); })
                .then(function (result) {
                assert.deepEqual(result.data, { myNumber: { n: 1 } });
                assert.deepEqual(options, { query: query, fetchPolicy: 'network-only' });
            });
        });
        it('can temporarily be disabled with ssrForceFetchDelay', function () {
            clock = sinon.useFakeTimers();
            var client = new ApolloClient({
                networkInterface: networkInterface,
                ssrForceFetchDelay: 100,
                addTypename: false,
            });
            var outerPromise = client.query({ query: query })
                .then(function () {
                var promise = client.query({ query: query, fetchPolicy: 'network-only' });
                clock.tick(0);
                return promise;
            })
                .then(function (result) {
                assert.deepEqual(result.data, { myNumber: { n: 1 } });
                clock.tick(100);
                var promise = client.query({ query: query, fetchPolicy: 'network-only' });
                clock.tick(0);
                return promise;
            })
                .then(function (result) {
                assert.deepEqual(result.data, { myNumber: { n: 2 } });
            });
            clock.tick(0);
            return outerPromise;
        });
        var _a;
    });
    it('should expose a method called printAST that is prints graphql queries', function () {
        var query = (_a = ["\n      query {\n        fortuneCookie\n      }"], _a.raw = ["\n      query {\n        fortuneCookie\n      }"], gql(_a));
        assert.equal(printAST(query), print(query));
        var _a;
    });
    it('should pass a network error correctly on a mutation', function (done) {
        var mutation = (_a = ["\n      mutation {\n        person {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      mutation {\n        person {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var data = {
            person: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var networkError = new Error('Some kind of network error.');
        var client = new ApolloClient({
            networkInterface: mockNetworkInterface({
                request: { query: mutation },
                result: { data: data },
                error: networkError,
            }),
            addTypename: false,
        });
        client.mutate({ mutation: mutation }).then(function (result) {
            done(new Error('Returned a result when it should not have.'));
        }).catch(function (error) {
            assert(error.networkError);
            assert.equal(error.networkError.message, networkError.message);
            done();
        });
        var _a;
    });
    it('should pass a GraphQL error correctly on a mutation', function (done) {
        var mutation = (_a = ["\n      mutation {\n        newPerson {\n          person {\n            firstName\n            lastName\n          }\n        }\n      }"], _a.raw = ["\n      mutation {\n        newPerson {\n          person {\n            firstName\n            lastName\n          }\n        }\n      }"], gql(_a));
        var data = {
            person: {
                firstName: 'John',
                lastName: 'Smith',
            },
        };
        var errors = [new Error('Some kind of GraphQL error.')];
        var client = new ApolloClient({
            networkInterface: mockNetworkInterface({
                request: { query: mutation },
                result: { data: data, errors: errors },
            }),
            addTypename: false,
        });
        client.mutate({ mutation: mutation }).then(function (result) {
            done(new Error('Returned a result when it should not have.'));
        }).catch(function (error) {
            assert(error.graphQLErrors);
            assert.equal(error.graphQLErrors.length, 1);
            assert.equal(error.graphQLErrors[0].message, errors[0].message);
            done();
        });
        var _a;
    });
    it('should rollback optimistic after mutation got a GraphQL error', function (done) {
        var mutation = (_a = ["\n      mutation {\n        newPerson {\n          person {\n            firstName\n            lastName\n          }\n        }\n      }"], _a.raw = ["\n      mutation {\n        newPerson {\n          person {\n            firstName\n            lastName\n          }\n        }\n      }"], gql(_a));
        var data = {
            newPerson: {
                person: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            },
        };
        var errors = [new Error('Some kind of GraphQL error.')];
        var client = new ApolloClient({
            networkInterface: mockNetworkInterface({
                request: { query: mutation },
                result: { data: data, errors: errors },
            }),
            addTypename: false,
        });
        var mutatePromise = client.mutate({
            mutation: mutation,
            optimisticResponse: {
                newPerson: {
                    person: {
                        firstName: 'John*',
                        lastName: 'Smith*',
                    },
                },
            },
        });
        assert.equal(client.store.getState().apollo.optimistic.length, 1);
        mutatePromise.then(function (result) {
            done(new Error('Returned a result when it should not have.'));
        }).catch(function (error) {
            assert.equal(client.store.getState().apollo.optimistic.length, 0);
            done();
        });
        var _a;
    });
    it('has a resetStore method which calls QueryManager', function (done) {
        var client = new ApolloClient();
        client.queryManager = {
            resetStore: function () {
                done();
            },
        };
        client.resetStore();
    });
    it('should allow us to create a network interface with transport-level batching', function (done) {
        var firstQuery = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var firstResult = {
            data: {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            },
            loading: false,
        };
        var secondQuery = (_b = ["\n      query {\n        person {\n          name\n        }\n      }"], _b.raw = ["\n      query {\n        person {\n          name\n        }\n      }"], gql(_b));
        var secondResult = {
            data: {
                person: {
                    name: 'Jane Smith',
                },
            },
        };
        var url = 'http://not-a-real-url.com';
        var oldFetch = fetch;
        fetch = createMockFetch({
            url: url,
            opts: {
                body: JSON.stringify([
                    {
                        query: print(firstQuery),
                    },
                    {
                        query: print(secondQuery),
                    },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: createMockedIResponse([firstResult, secondResult]),
        });
        var networkInterface = createBatchingNetworkInterface({
            uri: 'http://not-a-real-url.com',
            batchInterval: 5,
            opts: {},
        });
        Promise.all([
            networkInterface.query({ query: firstQuery }),
            networkInterface.query({ query: secondQuery }),
        ]).then(function (results) {
            assert.deepEqual(results, [firstResult, secondResult]);
            fetch = oldFetch;
            done();
        }).catch(function (e) {
            console.error(e);
        });
        var _a, _b;
    });
    it('should throw an error if response to batch request is not an array', function (done) {
        var firstQuery = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var firstResult = {
            data: {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            },
            loading: false,
        };
        var secondQuery = (_b = ["\n      query {\n        person {\n          name\n        }\n      }"], _b.raw = ["\n      query {\n        person {\n          name\n        }\n      }"], gql(_b));
        var url = 'http://not-a-real-url.com';
        var oldFetch = fetch;
        fetch = createMockFetch({
            url: url,
            opts: {
                body: JSON.stringify([
                    {
                        query: print(firstQuery),
                    },
                    {
                        query: print(secondQuery),
                    },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: createMockedIResponse(firstResult),
        });
        var networkInterface = createBatchingNetworkInterface({
            uri: 'http://not-a-real-url.com',
            batchInterval: 5,
            opts: {},
        });
        Promise.all([
            networkInterface.query({ query: firstQuery }),
            networkInterface.query({ query: secondQuery }),
        ]).then(function (results) {
            assert.equal(true, false, 'expected response to throw an error');
        }).catch(function (e) {
            assert.equal(e.message, 'BatchingNetworkInterface: server response is not an array');
            fetch = oldFetch;
            done();
        });
        var _a, _b;
    });
    it('should not do transport-level batching when the interval is exceeded', function (done) {
        var firstQuery = (_a = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var firstResult = {
            data: {
                author: {
                    firstName: 'John',
                    lastName: 'Smith',
                },
            },
            loading: false,
        };
        var secondQuery = (_b = ["\n      query {\n        person {\n          name\n        }\n      }"], _b.raw = ["\n      query {\n        person {\n          name\n        }\n      }"], gql(_b));
        var secondResult = {
            data: {
                person: {
                    name: 'Jane Smith',
                },
            },
        };
        var url = 'http://not-a-real-url.com';
        var oldFetch = fetch;
        fetch = createMockFetch({
            url: url,
            opts: {
                body: JSON.stringify([
                    {
                        query: print(firstQuery),
                    },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: createMockedIResponse([firstResult]),
        }, {
            url: url,
            opts: {
                body: JSON.stringify([
                    {
                        query: print(secondQuery),
                    },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: createMockedIResponse([secondResult]),
        });
        var networkInterface = createBatchingNetworkInterface({
            uri: 'http://not-a-real-url.com',
            batchInterval: 5,
            opts: {},
        });
        Promise.all([
            networkInterface.query({ query: firstQuery }),
            new Promise(function (resolve, reject) {
                return setTimeout(function () { return resolve(networkInterface.query({ query: secondQuery })); }, 10);
            }),
        ]).then(function (results) {
            assert.deepEqual(results, [firstResult, secondResult]);
            fetch = oldFetch;
            done();
        }).catch(function (e) {
            console.error(e);
        });
        var _a, _b;
    });
    it('should limit the amount of queries in a batch according to the batchMax value', function (done) {
        var authorQuery = (_a = ["\n      query {\n        author {\n          firstName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n        }\n      }"], gql(_a));
        var authorResult = {
            data: {
                author: {
                    firstName: 'John',
                },
            },
        };
        var personQuery = (_b = ["\n      query {\n        person {\n          name\n        }\n      }"], _b.raw = ["\n      query {\n        person {\n          name\n        }\n      }"], gql(_b));
        var personResult = {
            data: {
                person: {
                    name: 'Jane Smith',
                },
            },
        };
        var url = 'http://not-a-real-url.com';
        var networkInterface = createBatchingNetworkInterface({
            uri: url,
            batchInterval: 5,
            batchMax: 2,
            opts: {},
        });
        var oldFetch = fetch;
        fetch = createMockFetch({
            url: url,
            opts: {
                body: JSON.stringify([
                    { query: print(authorQuery) },
                    { query: print(personQuery) },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: createMockedIResponse([authorResult, personResult]),
        }, {
            url: url,
            opts: {
                body: JSON.stringify([
                    { query: print(authorQuery) },
                    { query: print(personQuery) },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: createMockedIResponse([authorResult, personResult]),
        }, {
            url: url,
            opts: {
                body: JSON.stringify([
                    { query: print(authorQuery) },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: createMockedIResponse([authorResult]),
        });
        Promise.all([
            networkInterface.query({ query: authorQuery }),
            networkInterface.query({ query: personQuery }),
            networkInterface.query({ query: authorQuery }),
            networkInterface.query({ query: personQuery }),
            networkInterface.query({ query: authorQuery }),
        ]).then(function (results) {
            assert.deepEqual(results, [
                authorResult,
                personResult,
                authorResult,
                personResult,
                authorResult,
            ]);
            fetch = oldFetch;
            done();
        }).catch(function (e) {
            console.error(e);
        });
        var _a, _b;
    });
    it('should not limit the amount of queries in a batch when batchMax is not set', function (done) {
        var authorQuery = (_a = ["\n      query {\n        author {\n          firstName\n        }\n      }"], _a.raw = ["\n      query {\n        author {\n          firstName\n        }\n      }"], gql(_a));
        var authorResult = {
            data: {
                author: {
                    firstName: 'John',
                },
            },
        };
        var personQuery = (_b = ["\n      query {\n        person {\n          name\n        }\n      }"], _b.raw = ["\n      query {\n        person {\n          name\n        }\n      }"], gql(_b));
        var personResult = {
            data: {
                person: {
                    name: 'Jane Smith',
                },
            },
        };
        var url = 'http://not-a-real-url.com';
        var networkInterface = createBatchingNetworkInterface({
            uri: url,
            batchInterval: 5,
            opts: {},
        });
        var oldFetch = fetch;
        fetch = createMockFetch({
            url: url,
            opts: {
                body: JSON.stringify([
                    { query: print(authorQuery) },
                    { query: print(personQuery) },
                    { query: print(authorQuery) },
                    { query: print(personQuery) },
                    { query: print(authorQuery) },
                ]),
                headers: {
                    Accept: '*/*',
                    'Content-Type': 'application/json',
                },
                method: 'POST',
            },
            result: createMockedIResponse([
                authorResult,
                personResult,
                authorResult,
                personResult,
                authorResult,
            ]),
        });
        Promise.all([
            networkInterface.query({ query: authorQuery }),
            networkInterface.query({ query: personQuery }),
            networkInterface.query({ query: authorQuery }),
            networkInterface.query({ query: personQuery }),
            networkInterface.query({ query: authorQuery }),
        ]).then(function (results) {
            assert.deepEqual(results, [
                authorResult,
                personResult,
                authorResult,
                personResult,
                authorResult,
            ]);
            fetch = oldFetch;
            done();
        }).catch(function (e) {
            console.error(e);
        });
        var _a, _b;
    });
    it('should enable dev tools logging', function () {
        var query = (_a = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], _a.raw = ["\n      query people {\n        allPeople(first: 1) {\n          people {\n            name\n          }\n        }\n      }\n    "], gql(_a));
        var data = {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                    },
                ],
            },
        };
        it('with self-made store', function () {
            var networkInterface = mockNetworkInterface({
                request: { query: cloneDeep(query) },
                result: { data: data },
            });
            var client = new ApolloClient({
                networkInterface: networkInterface,
                addTypename: false,
            });
            var log = [];
            client.__actionHookForDevTools(function (entry) {
                log.push(entry);
            });
            return client.query({ query: query })
                .then(function () {
                assert.equal(log.length, 2);
                assert.equal(log[1].state.queries['0'].loading, false);
            });
        });
        it('with passed in store', function () {
            var networkInterface = mockNetworkInterface({
                request: { query: cloneDeep(query) },
                result: { data: data },
            });
            var client = new ApolloClient({
                networkInterface: networkInterface,
                addTypename: false,
            });
            createStore(combineReducers({
                apollo: client.reducer(),
            }), {}, applyMiddleware(client.middleware()));
            var log = [];
            client.__actionHookForDevTools(function (entry) {
                log.push(entry);
            });
            return client.query({ query: query })
                .then(function () {
                assert.equal(log.length, 2);
            });
        });
        var _a;
    });
    it('should propagate errors from network interface to observers', function (done) {
        var networkInterface = {
            query: function () { return Promise.reject(new Error('Uh oh!')); },
        };
        var client = new ApolloClient({
            networkInterface: networkInterface,
            addTypename: false,
        });
        var handle = client.watchQuery({ query: (_a = ["query { a b c }"], _a.raw = ["query { a b c }"], gql(_a)) });
        handle.subscribe({
            error: function (error) {
                assert.equal(error.message, 'Network error: Uh oh!');
                done();
            },
        });
        var _a;
    });
    it('should throw a GraphQL error', function () {
        var query = (_a = ["\n      query {\n        posts {\n          foo\n          __typename\n        }\n      }\n    "], _a.raw = ["\n      query {\n        posts {\n          foo\n          __typename\n        }\n      }\n    "], gql(_a));
        var errors = [{
                name: 'test',
                message: 'Cannot query field "foo" on type "Post".',
            }];
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: { errors: errors },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
        });
        return client.query({ query: query }).catch(function (err) {
            assert.equal(err.message, 'GraphQL error: Cannot query field "foo" on type "Post".');
        });
        var _a;
    });
    it('should warn if server returns wrong data', function () {
        var query = (_a = ["\n      query {\n        todos {\n          id\n          name\n          description\n          __typename\n        }\n      }\n    "], _a.raw = ["\n      query {\n        todos {\n          id\n          name\n          description\n          __typename\n        }\n      }\n    "], gql(_a));
        var result = {
            data: {
                todos: [
                    {
                        id: '1',
                        name: 'Todo 1',
                        price: 100,
                        __typename: 'Todo',
                    },
                ],
            },
        };
        var networkInterface = mockNetworkInterface({
            request: { query: query },
            result: result,
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
        });
        return withWarning(function () { return client.query({ query: query }); }, /Missing field description/);
        var _a;
    });
    it('runs a query with the connection directive and writes it to the store key defined in the directive', function () {
        var query = (_a = ["\n      {\n        books(skip: 0, limit: 2) @connection(key: \"abc\") {\n          name\n        }\n      }"], _a.raw = ["\n      {\n        books(skip: 0, limit: 2) @connection(key: \"abc\") {\n          name\n        }\n      }"], gql(_a));
        var transformedQuery = (_b = ["\n      {\n        books(skip: 0, limit: 2) @connection(key: \"abc\") {\n          name\n          __typename\n        }\n      }"], _b.raw = ["\n      {\n        books(skip: 0, limit: 2) @connection(key: \"abc\") {\n          name\n          __typename\n        }\n      }"], gql(_b));
        var result = {
            'books': [
                {
                    'name': 'abcd',
                    '__typename': 'Book',
                },
            ],
        };
        var networkInterface = mockNetworkInterface({
            request: { query: transformedQuery },
            result: { data: result },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
        });
        return client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a, _b;
    });
    it('should not remove the connection directive at the store level', function () {
        var query = (_a = ["\n      {\n        books(skip: 0, limit: 2) @connection {\n          name\n        }\n      }"], _a.raw = ["\n      {\n        books(skip: 0, limit: 2) @connection {\n          name\n        }\n      }"], gql(_a));
        var transformedQuery = (_b = ["\n      {\n        books(skip: 0, limit: 2) @connection {\n          name\n          __typename\n        }\n      }"], _b.raw = ["\n      {\n        books(skip: 0, limit: 2) @connection {\n          name\n          __typename\n        }\n      }"], gql(_b));
        var result = {
            'books': [
                {
                    'name': 'abcd',
                    '__typename': 'Book',
                },
            ],
        };
        var networkInterface = mockNetworkInterface({
            request: { query: transformedQuery },
            result: { data: result },
        });
        var client = new ApolloClient({
            networkInterface: networkInterface,
        });
        return client.query({ query: query }).then(function (actualResult) {
            assert.deepEqual(actualResult.data, result);
        });
        var _a, _b;
    });
});
it('should run a query with the connection directive and write the result to the store key defined in the directive', function () {
    var query = (_a = ["\n      {\n        books(skip: 0, limit: 2) @connection(key: \"abc\") {\n          name\n        }\n      }"], _a.raw = ["\n      {\n        books(skip: 0, limit: 2) @connection(key: \"abc\") {\n          name\n        }\n      }"], gql(_a));
    var transformedQuery = (_b = ["\n      {\n        books(skip: 0, limit: 2) @connection(key: \"abc\") {\n          name\n          __typename\n        }\n      }"], _b.raw = ["\n      {\n        books(skip: 0, limit: 2) @connection(key: \"abc\") {\n          name\n          __typename\n        }\n      }"], gql(_b));
    var result = {
        'books': [
            {
                'name': 'abcd',
                '__typename': 'Book',
            },
        ],
    };
    var networkInterface = mockNetworkInterface({
        request: { query: transformedQuery },
        result: { data: result },
    });
    var client = new ApolloClient({
        networkInterface: networkInterface,
    });
    return client.query({ query: query }).then(function (actualResult) {
        assert.deepEqual(actualResult.data, result);
        assert.deepEqual(client.store.getState().apollo.data, {
            'ROOT_QUERY.abc.0': { name: 'abcd', __typename: 'Book' },
            'ROOT_QUERY': {
                abc: [
                    {
                        'generated': true,
                        'id': 'ROOT_QUERY.abc.0',
                        'type': 'id',
                    },
                ],
            },
        });
    });
    var _a, _b;
});
it('should run a query with the connection directive and filter arguments and write the result to the correct store key', function () {
    var query = (_a = ["\n      query books($order: string) {\n        books(skip: 0, limit: 2, order: $order) @connection(key: \"abc\", filter: [\"order\"]) {\n          name\n          __typename\n        }\n      }"], _a.raw = ["\n      query books($order: string) {\n        books(skip: 0, limit: 2, order: $order) @connection(key: \"abc\", filter: [\"order\"]) {\n          name\n          __typename\n        }\n      }"], gql(_a));
    var result = {
        'books': [
            {
                'name': 'abcd',
                '__typename': 'Book',
            },
        ],
    };
    var variables = { order: 'popularity' };
    var networkInterface = mockNetworkInterface({
        request: { query: query, variables: variables },
        result: { data: result },
    });
    var client = new ApolloClient({
        networkInterface: networkInterface,
    });
    return client.query({ query: query, variables: variables }).then(function (actualResult) {
        assert.deepEqual(actualResult.data, result);
        assert.deepEqual(client.store.getState().apollo.data, {
            'ROOT_QUERY.abc({"order":"popularity"}).0': { name: 'abcd', __typename: 'Book' },
            'ROOT_QUERY': {
                'abc({"order":"popularity"})': [
                    {
                        'generated': true,
                        'id': 'ROOT_QUERY.abc({"order":"popularity"}).0',
                        'type': 'id',
                    },
                ],
            },
        });
    });
    var _a;
});
function clientRoundtrip(query, data, variables, fragmentMatcher) {
    var networkInterface = mockNetworkInterface({
        request: { query: cloneDeep(query) },
        result: data,
    });
    var client = new ApolloClient({
        networkInterface: networkInterface,
        fragmentMatcher: fragmentMatcher,
    });
    return client.query({ query: query, variables: variables }).then(function (result) {
        assert.deepEqual(result.data, data.data);
    });
}
//# sourceMappingURL=client.js.map