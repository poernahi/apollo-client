import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { assign, isEqual } from 'lodash';
import * as fetchMock from 'fetch-mock';
chai.use(chaiAsPromised);
var assert = chai.assert, expect = chai.expect;
import { createNetworkInterface, } from '../src/transport/networkInterface';
import gql from 'graphql-tag';
import { print } from 'graphql/language/printer';
import { withWarning } from './util/wrap';
describe('network interface', function () {
    var swapiUrl = 'http://graphql-swapi.test/';
    var missingUrl = 'http://does-not-exist.test/';
    var unauthorizedUrl = 'http://unauthorized.test/';
    var serviceUnavailableUrl = 'http://service-unavailable.test/';
    var simpleQueryWithNoVars = (_a = ["\n    query people {\n      allPeople(first: 1) {\n        people {\n          name\n        }\n      }\n    }\n  "], _a.raw = ["\n    query people {\n      allPeople(first: 1) {\n        people {\n          name\n        }\n      }\n    }\n  "], gql(_a));
    var simpleQueryWithVar = (_b = ["\n    query people($personNum: Int!) {\n      allPeople(first: $personNum) {\n        people {\n          name\n        }\n      }\n    }\n  "], _b.raw = ["\n    query people($personNum: Int!) {\n      allPeople(first: $personNum) {\n        people {\n          name\n        }\n      }\n    }\n  "], gql(_b));
    var simpleQueryWithConnection = (_c = ["\n    query people {\n      allPeople(first: 1) @connection(key: \"people\") {\n        people {\n          name\n        }\n      }\n    }\n  "], _c.raw = ["\n    query people {\n      allPeople(first: 1) @connection(key: \"people\") {\n        people {\n          name\n        }\n      }\n    }\n  "], gql(_c));
    var simpleQueryWithConnectionButNoKey = (_d = ["\n    query people {\n      allPeople(first: 1) @connection {\n        people {\n          name\n        }\n      }\n    }\n  "], _d.raw = ["\n    query people {\n      allPeople(first: 1) @connection {\n        people {\n          name\n        }\n      }\n    }\n  "], gql(_d));
    var simpleResult = {
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
    var complexQueryWithTwoVars = (_e = ["\n    query people($personNum: Int!, $filmNum: Int!) {\n      allPeople(first: $personNum) {\n        people {\n          name\n          filmConnection(first: $filmNum) {\n            edges {\n              node {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  "], _e.raw = ["\n    query people($personNum: Int!, $filmNum: Int!) {\n      allPeople(first: $personNum) {\n        people {\n          name\n          filmConnection(first: $filmNum) {\n            edges {\n              node {\n                id\n              }\n            }\n          }\n        }\n      }\n    }\n  "], gql(_e));
    var complexResult = {
        data: {
            allPeople: {
                people: [
                    {
                        name: 'Luke Skywalker',
                        filmConnection: {
                            edges: [
                                {
                                    node: {
                                        id: 'ZmlsbXM6MQ==',
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },
    };
    before(function () {
        fetchMock.post(swapiUrl, function (url, opts) {
            var _a = JSON.parse(opts.body.toString()), query = _a.query, variables = _a.variables;
            if (query === print(simpleQueryWithNoVars)) {
                return simpleResult;
            }
            if (query === print(simpleQueryWithVar)
                && isEqual(variables, { personNum: 1 })) {
                return simpleResult;
            }
            if (query === print(complexQueryWithTwoVars)
                && isEqual(variables, { personNum: 1, filmNum: 1 })) {
                return complexResult;
            }
            throw new Error('Invalid Query');
        });
        fetchMock.post(missingUrl, function () {
            throw new Error('Network error');
        });
        fetchMock.post(unauthorizedUrl, 403);
        fetchMock.post(serviceUnavailableUrl, 503);
    });
    after(function () {
        fetchMock.restore();
    });
    describe('creating a network interface', function () {
        it('should throw without an argument', function () {
            assert.throws(function () {
                createNetworkInterface(undefined);
            }, /must pass an options argument/);
        });
        it('should throw without an endpoint', function () {
            assert.throws(function () {
                createNetworkInterface({});
            }, /A remote endpoint is required for a network layer/);
        });
        it('should warn when the endpoint is passed as the first argument', function () {
            return withWarning(function () {
                createNetworkInterface('/graphql');
            }, /Passing the URI as the first argument to createNetworkInterface is deprecated/);
        });
        it('should create an instance with a given uri', function () {
            var networkInterface = createNetworkInterface({ uri: '/graphql' });
            assert.equal(networkInterface._uri, '/graphql');
        });
        it('should allow for storing of custom options', function () {
            var customOpts = {
                headers: { 'Authorizaion': 'working' },
                credentials: 'include',
            };
            var networkInterface = createNetworkInterface({ uri: '/graphql', opts: customOpts });
            assert.deepEqual(networkInterface._opts, assign({}, customOpts));
        });
        it('should not mutate custom options', function () {
            var customOpts = {
                headers: ['Authorizaion', 'working'],
                credentials: 'include',
            };
            var originalOpts = assign({}, customOpts);
            var networkInterface = createNetworkInterface({ uri: '/graphql', opts: customOpts });
            delete customOpts.headers;
            assert.deepEqual(networkInterface._opts, originalOpts);
        });
    });
    describe('middleware', function () {
        it('should throw an error if you pass something bad', function () {
            var malWare = {};
            var networkInterface = createNetworkInterface({ uri: '/graphql' });
            try {
                networkInterface.use([malWare]);
                expect.fail();
            }
            catch (error) {
                assert.equal(error.message, 'Middleware must implement the applyMiddleware function');
            }
        });
        it('should take a middleware and assign it', function () {
            var testWare = TestWare();
            var networkInterface = createNetworkInterface({ uri: '/graphql' });
            networkInterface.use([testWare]);
            assert.equal(networkInterface._middlewares[0], testWare);
        });
        it('should take more than one middleware and assign it', function () {
            var testWare1 = TestWare();
            var testWare2 = TestWare();
            var networkInterface = createNetworkInterface({ uri: '/graphql' });
            networkInterface.use([testWare1, testWare2]);
            assert.deepEqual(networkInterface._middlewares, [testWare1, testWare2]);
        });
        it('should alter the request variables', function () {
            var testWare1 = TestWare([
                { key: 'personNum', val: 1 },
            ]);
            var swapi = createNetworkInterface({ uri: swapiUrl });
            swapi.use([testWare1]);
            var simpleRequest = {
                query: simpleQueryWithVar,
                variables: {},
                debugName: 'People query',
            };
            return assert.eventually.deepEqual(swapi.query(simpleRequest), simpleResult);
        });
        it('should alter the options but not overwrite defaults', function () {
            var testWare1 = TestWare([], [
                { key: 'planet', val: 'mars' },
            ]);
            var swapi = createNetworkInterface({ uri: swapiUrl });
            swapi.use([testWare1]);
            var simpleRequest = {
                query: simpleQueryWithNoVars,
                variables: {},
                debugName: 'People query',
            };
            return swapi.query(simpleRequest).then(function (data) {
                assert.equal(fetchMock.lastCall()[1].planet, 'mars');
                assert.notOk(swapi._opts['planet']);
            });
        });
        it('should alter the request body params', function () {
            var testWare1 = TestWare([], [], [
                { key: 'newParam', val: '0123456789' },
            ]);
            var swapi = createNetworkInterface({ uri: 'http://graphql-swapi.test/' });
            swapi.use([testWare1]);
            var simpleRequest = {
                query: simpleQueryWithVar,
                variables: { personNum: 1 },
                debugName: 'People query',
            };
            return swapi.query(simpleRequest).then(function (data) {
                return assert.deepEqual(JSON.parse(fetchMock.lastCall()[1].body), {
                    query: 'query people($personNum: Int!) {\n  allPeople(first: $personNum) {\n    people {\n      name\n    }\n  }\n}\n',
                    variables: { personNum: 1 },
                    debugName: 'People query',
                    newParam: '0123456789',
                });
            });
        });
        it('handle multiple middlewares', function () {
            var testWare1 = TestWare([
                { key: 'personNum', val: 1 },
            ]);
            var testWare2 = TestWare([
                { key: 'filmNum', val: 1 },
            ]);
            var swapi = createNetworkInterface({ uri: 'http://graphql-swapi.test/' });
            swapi.use([testWare1, testWare2]);
            var simpleRequest = {
                query: complexQueryWithTwoVars,
                variables: {},
                debugName: 'People query',
            };
            return assert.eventually.deepEqual(swapi.query(simpleRequest), complexResult);
        });
        it('should chain use() calls', function () {
            var testWare1 = TestWare([
                { key: 'personNum', val: 1 },
            ]);
            var testWare2 = TestWare([
                { key: 'filmNum', val: 1 },
            ]);
            var swapi = createNetworkInterface({ uri: swapiUrl });
            swapi.use([testWare1])
                .use([testWare2]);
            var simpleRequest = {
                query: complexQueryWithTwoVars,
                variables: {},
                debugName: 'People query',
            };
            return assert.eventually.deepEqual(swapi.query(simpleRequest), complexResult);
        });
        it('should chain use() and useAfter() calls', function () {
            var testWare1 = TestWare();
            var testWare2 = TestAfterWare();
            var networkInterface = createNetworkInterface({ uri: swapiUrl });
            networkInterface.use([testWare1])
                .useAfter([testWare2]);
            assert.deepEqual(networkInterface._middlewares, [testWare1]);
            assert.deepEqual(networkInterface._afterwares, [testWare2]);
        });
    });
    describe('afterware', function () {
        it('should return errors thrown in afterwares', function () {
            var networkInterface = createNetworkInterface({ uri: swapiUrl });
            networkInterface.useAfter([{
                    applyAfterware: function () {
                        throw Error('Afterware error');
                    },
                }]);
            var simpleRequest = {
                query: simpleQueryWithNoVars,
                variables: {},
                debugName: 'People query',
            };
            return assert.isRejected(networkInterface.query(simpleRequest), Error, 'Afterware error');
        });
        it('should throw an error if you pass something bad', function () {
            var malWare = TestAfterWare();
            delete malWare.applyAfterware;
            var networkInterface = createNetworkInterface({ uri: '/graphql' });
            try {
                networkInterface.useAfter([malWare]);
                expect.fail();
            }
            catch (error) {
                assert.equal(error.message, 'Afterware must implement the applyAfterware function');
            }
        });
        it('should take a afterware and assign it', function () {
            var testWare = TestAfterWare();
            var networkInterface = createNetworkInterface({ uri: '/graphql' });
            networkInterface.useAfter([testWare]);
            assert.equal(networkInterface._afterwares[0], testWare);
        });
        it('should take more than one afterware and assign it', function () {
            var testWare1 = TestAfterWare();
            var testWare2 = TestAfterWare();
            var networkInterface = createNetworkInterface({ uri: '/graphql' });
            networkInterface.useAfter([testWare1, testWare2]);
            assert.deepEqual(networkInterface._afterwares, [testWare1, testWare2]);
        });
        it('should chain useAfter() calls', function () {
            var testWare1 = TestAfterWare();
            var testWare2 = TestAfterWare();
            var networkInterface = createNetworkInterface({ uri: '/graphql' });
            networkInterface.useAfter([testWare1])
                .useAfter([testWare2]);
            assert.deepEqual(networkInterface._afterwares, [testWare1, testWare2]);
        });
        it('should chain useAfter() and use() calls', function () {
            var testWare1 = TestAfterWare();
            var testWare2 = TestWare();
            var networkInterface = createNetworkInterface({ uri: swapiUrl });
            networkInterface.useAfter([testWare1])
                .use([testWare2]);
            assert.deepEqual(networkInterface._middlewares, [testWare2]);
            assert.deepEqual(networkInterface._afterwares, [testWare1]);
        });
    });
    describe('making a request', function () {
        var doomedToFail = {
            query: simpleQueryWithNoVars,
            variables: {},
            debugName: 'People Query',
        };
        it('should fetch remote data', function () {
            var swapi = createNetworkInterface({ uri: swapiUrl });
            var simpleRequest = {
                query: simpleQueryWithNoVars,
                variables: {},
                debugName: 'People query',
            };
            return assert.eventually.deepEqual(swapi.query(simpleRequest), simpleResult);
        });
        it('should throw on a network error', function () {
            var nowhere = createNetworkInterface({ uri: missingUrl });
            return assert.isRejected(nowhere.query(doomedToFail));
        });
        it('should throw an error with the response when request is forbidden', function () {
            var unauthorizedInterface = createNetworkInterface({ uri: unauthorizedUrl });
            return unauthorizedInterface.query(doomedToFail).catch(function (err) {
                assert.isOk(err.response);
                assert.equal(err.response.status, 403);
                assert.equal(err.message, 'Network request failed with status 403 - "Forbidden"');
            });
        });
        it('should throw an error with the response when service is unavailable', function () {
            var unauthorizedInterface = createNetworkInterface({ uri: serviceUnavailableUrl });
            return unauthorizedInterface.query(doomedToFail).catch(function (err) {
                assert.isOk(err.response);
                assert.equal(err.response.status, 503);
                assert.equal(err.message, 'Network request failed with status 503 - "Service Unavailable"');
            });
        });
    });
    describe('transforming queries', function () {
        it('should remove the @connection directive', function () {
            var swapi = createNetworkInterface({ uri: swapiUrl });
            var simpleRequestWithConnection = {
                query: simpleQueryWithConnection,
                variables: {},
                debugName: 'People query',
            };
            return assert.eventually.deepEqual(swapi.query(simpleRequestWithConnection), simpleResult);
        });
        it('should remove the @connection directive even with no key but warn the user', function () {
            var swapi = createNetworkInterface({ uri: swapiUrl });
            var simpleRequestWithConnectionButNoKey = {
                query: simpleQueryWithConnectionButNoKey,
                variables: {},
                debugName: 'People query',
            };
            var expected = 'Removing an @connection directive even though it does not have a ' +
                'key. You may want to use the key parameter to specify a store key.';
            return assert.eventually.deepEqual(withWarning(function () { return swapi.query(simpleRequestWithConnectionButNoKey); }, new RegExp(expected)), simpleResult);
        });
    });
    var _a, _b, _c, _d, _e;
});
function TestWare(variables, options, bodyParams) {
    if (variables === void 0) { variables = []; }
    if (options === void 0) { options = []; }
    if (bodyParams === void 0) { bodyParams = []; }
    return {
        applyMiddleware: function (request, next) {
            variables.map(function (variable) {
                request.request.variables[variable.key] = variable.val;
            });
            options.map(function (variable) {
                request.options[variable.key] = variable.val;
            });
            bodyParams.map(function (param) {
                request.request[param.key] = param.val;
            });
            next();
        },
    };
}
function TestAfterWare(options) {
    if (options === void 0) { options = []; }
    return {
        applyAfterware: function (response, next) {
            options.map(function (variable) {
                response.options[variable.key] = variable.val;
            });
            next();
        },
    };
}
//# sourceMappingURL=networkInterface.js.map