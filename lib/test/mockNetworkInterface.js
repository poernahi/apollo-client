import { assert, } from 'chai';
import { mockSubscriptionNetworkInterface, } from './mocks/mockNetworkInterface';
import { omit } from 'lodash';
import gql from 'graphql-tag';
describe('MockSubscriptionNetworkInterface', function () {
    var result1 = {
        result: {
            data: { user: { name: 'Dhaivat Pandya' } },
        },
        delay: 50,
    };
    var result2 = {
        result: {
            data: { user: { name: 'Vyacheslav Kim' } },
        },
        delay: 50,
    };
    var result3 = {
        result: {
            data: { user: { name: 'Changping Chen' } },
        },
        delay: 50,
    };
    var result4 = {
        result: {
            data: { user: { name: 'Amanda Liu' } },
        },
        delay: 50,
    };
    var sub1;
    beforeEach(function () {
        sub1 = {
            request: {
                query: (_a = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], _a.raw = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], gql(_a)),
                variables: {
                    name: 'Changping Chen',
                },
            },
            id: 0,
            results: [result1, result2, result3, result4],
        };
        var _a;
    });
    it('correctly adds mocked subscriptions', function () {
        var networkInterface = mockSubscriptionNetworkInterface([sub1]);
        var mockedSubscriptionsByKey = networkInterface.mockedSubscriptionsByKey;
        assert.equal(Object.keys(mockedSubscriptionsByKey).length, 1);
        var key = Object.keys(mockedSubscriptionsByKey)[0];
        assert.deepEqual(mockedSubscriptionsByKey[key], [sub1]);
    });
    it('correctly adds multiple mocked subscriptions', function () {
        var networkInterface = mockSubscriptionNetworkInterface([sub1, sub1]);
        var mockedSubscriptionsByKey = networkInterface.mockedSubscriptionsByKey;
        assert.equal(Object.keys(mockedSubscriptionsByKey).length, 1);
        var key = Object.keys(mockedSubscriptionsByKey)[0];
        assert.deepEqual(mockedSubscriptionsByKey[key], [sub1, sub1]);
    });
    it('throws an error when firing a result array is empty', function () {
        var noResultSub = omit(sub1, 'results');
        assert.throw(function () {
            var networkInterface = mockSubscriptionNetworkInterface([noResultSub]);
            networkInterface.subscribe({
                query: (_a = ["\n            query UserInfo($name: String) {\n              user(name: $name) {\n                name\n              }\n            }\n          "], _a.raw = ["\n            query UserInfo($name: String) {\n              user(name: $name) {\n                name\n              }\n            }\n          "], gql(_a)),
                variables: {
                    name: 'Changping Chen',
                },
            }, function (error, result) {
                assert.deepEqual(result, result1.result);
            });
            networkInterface.fireResult(0);
            var _a;
        });
    });
    it('throws an error when firing a subscription id that does not exist', function () {
        var noResultSub = omit(sub1, 'results');
        assert.throw(function () {
            var networkInterface = mockSubscriptionNetworkInterface([noResultSub]);
            networkInterface.subscribe({
                query: (_a = ["\n            query UserInfo($name: String) {\n              user(name: $name) {\n                name\n              }\n            }\n          "], _a.raw = ["\n            query UserInfo($name: String) {\n              user(name: $name) {\n                name\n              }\n            }\n          "], gql(_a)),
                variables: {
                    name: 'Changping Chen',
                },
            }, function (error, result) {
                assert.deepEqual(result, result1.result);
            });
            networkInterface.fireResult(4);
            var _a;
        });
    });
    it('correctly subscribes', function (done) {
        var networkInterface = mockSubscriptionNetworkInterface([sub1]);
        var id = networkInterface.subscribe({
            query: (_a = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], _a.raw = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], gql(_a)),
            variables: {
                name: 'Changping Chen',
            },
        }, function (error, result) {
            assert.deepEqual(result, result1.result.data);
            done();
        });
        networkInterface.fireResult(0);
        assert.equal(id, 0);
        assert.deepEqual(networkInterface.mockedSubscriptionsById[0], sub1);
        var _a;
    });
    it('correctly fires results', function (done) {
        var networkInterface = mockSubscriptionNetworkInterface([sub1]);
        networkInterface.subscribe({
            query: (_a = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], _a.raw = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], gql(_a)),
            variables: {
                name: 'Changping Chen',
            },
        }, function (error, result) {
            assert.deepEqual(result, result1.result.data);
            done();
        });
        networkInterface.fireResult(0);
        var _a;
    });
    it('correctly fires multiple results', function (done) {
        var allResults = [];
        var networkInterface = mockSubscriptionNetworkInterface([sub1]);
        networkInterface.subscribe({
            query: (_a = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], _a.raw = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], gql(_a)),
            variables: {
                name: 'Changping Chen',
            },
        }, function (error, result) {
            allResults.push(result);
        });
        for (var i = 0; i < 4; i++) {
            networkInterface.fireResult(0);
        }
        setTimeout(function () {
            assert.deepEqual(allResults, [result1.result.data, result2.result.data, result3.result.data, result4.result.data]);
            done();
        }, 50);
        var _a;
    });
    it('correctly unsubscribes', function () {
        var networkInterface = mockSubscriptionNetworkInterface([sub1]);
        networkInterface.subscribe({
            query: (_a = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], _a.raw = ["\n          query UserInfo($name: String) {\n            user(name: $name) {\n              name\n            }\n          }\n        "], gql(_a)),
            variables: {
                name: 'Changping Chen',
            },
        }, function (error, result) {
            assert(false);
        });
        networkInterface.unsubscribe(0);
        assert.throw(function () {
            networkInterface.fireResult(0);
        });
        var _a;
    });
});
//# sourceMappingURL=mockNetworkInterface.js.map