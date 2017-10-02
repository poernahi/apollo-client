import * as chai from 'chai';
var assert = chai.assert;
import gql from 'graphql-tag';
import { createApolloStore, } from '../src/store';
import { getOperationName } from '../src/queries/getFromAST';
describe('createApolloStore', function () {
    it('does not require any arguments', function () {
        var store = createApolloStore();
        assert.isDefined(store);
    });
    it('has a default root key', function () {
        var store = createApolloStore();
        assert.deepEqual(store.getState()['apollo'], {
            data: {},
            optimistic: [],
            reducerError: null,
        });
    });
    it('can take a custom root key', function () {
        var store = createApolloStore({
            reduxRootKey: 'test',
        });
        assert.deepEqual(store.getState()['test'], {
            data: {},
            optimistic: [],
            reducerError: null,
        });
    });
    it('can be rehydrated from the server', function () {
        var initialState = {
            apollo: {
                data: {
                    'test.0': true,
                },
                optimistic: [],
            },
        };
        var store = createApolloStore({
            initialState: initialState,
        });
        assert.deepEqual(store.getState(), {
            apollo: {
                data: initialState.apollo.data,
                optimistic: initialState.apollo.optimistic,
                reducerError: null,
            },
        });
    });
    it('throws an error if state contains a non-empty queries field', function () {
        var initialState = {
            apollo: {
                queries: {
                    'test.0': true,
                },
                mutations: {},
                data: {
                    'test.0': true,
                },
                optimistic: [],
            },
        };
        assert.throws(function () { return createApolloStore({
            initialState: initialState,
        }); });
    });
    it('throws an error if state contains a non-empty mutations field', function () {
        var initialState = {
            apollo: {
                queries: {},
                mutations: { 0: true },
                data: {
                    'test.0': true,
                },
                optimistic: [],
            },
        };
        assert.throws(function () { return createApolloStore({
            initialState: initialState,
        }); });
    });
    it('reset itself', function () {
        var initialState = {
            apollo: {
                data: {
                    'test.0': true,
                },
            },
        };
        var emptyState = {
            data: {},
            optimistic: [],
            reducerError: null,
        };
        var store = createApolloStore({
            initialState: initialState,
        });
        store.dispatch({
            type: 'APOLLO_STORE_RESET',
            observableQueryIds: [],
        });
        assert.deepEqual(store.getState().apollo, emptyState);
    });
    it('can reset itself and keep the observable query ids', function () {
        var queryDocument = (_a = [" query { abc }"], _a.raw = [" query { abc }"], gql(_a));
        var initialState = {
            apollo: {
                data: {
                    'test.0': true,
                    'test.1': true,
                },
                optimistic: [],
            },
        };
        var emptyState = {
            data: {},
            optimistic: [],
            reducerError: null,
        };
        var store = createApolloStore({
            initialState: initialState,
        });
        store.dispatch({
            type: 'APOLLO_QUERY_INIT',
            queryId: 'test.0',
            queryString: '',
            document: queryDocument,
            operationName: getOperationName(queryDocument),
            variables: {},
            fetchPolicy: 'cache-first',
            requestId: 1,
            storePreviousVariables: false,
            isPoll: false,
            isRefetch: false,
            metadata: null,
        });
        store.dispatch({
            type: 'APOLLO_STORE_RESET',
            observableQueryIds: ['test.0'],
        });
        assert.deepEqual(store.getState().apollo, emptyState);
        var _a;
    });
    it('can\'t crash the reducer', function () {
        var initialState = {
            apollo: {
                data: {},
                optimistic: [],
                reducerError: null,
            },
        };
        var store = createApolloStore({
            initialState: initialState,
        });
        var mutationString = "mutation Increment { incrementer { counter } }";
        var mutation = (_a = ["", ""], _a.raw = ["", ""], gql(_a, mutationString));
        var variables = {};
        store.dispatch({
            type: 'APOLLO_MUTATION_INIT',
            mutationString: mutationString,
            mutation: mutation,
            variables: variables,
            operationName: 'Increment',
            mutationId: '1',
            optimisticResponse: { data: { incrementer: { counter: 1 } } },
        });
        store.dispatch({
            type: 'APOLLO_MUTATION_RESULT',
            result: { data: { incrementer: { counter: 1 } } },
            document: mutation,
            operationName: 'Increment',
            variables: variables,
            mutationId: '1',
            extraReducers: [function () { throw new Error('test!!!'); }],
        });
        assert(/test!!!/.test(store.getState().apollo.reducerError.error));
        var resetState = {
            data: {},
            optimistic: [
                {
                    data: {},
                    mutationId: '1',
                    action: {
                        type: 'APOLLO_MUTATION_RESULT',
                        result: { data: { data: { incrementer: { counter: 1 } } } },
                        document: mutation,
                        operationName: 'Increment',
                        variables: {},
                        mutationId: '1',
                        extraReducers: undefined,
                        updateQueries: undefined,
                        update: undefined,
                    },
                },
            ],
            reducerError: null,
        };
        store.dispatch({
            type: 'APOLLO_STORE_RESET',
            observableQueryIds: ['test.0'],
        });
        assert.deepEqual(store.getState().apollo, resetState);
        var _a;
    });
});
//# sourceMappingURL=store.js.map