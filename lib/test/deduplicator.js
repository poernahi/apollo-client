import gql from 'graphql-tag';
import { assert } from 'chai';
import { Deduplicator } from '../src/transport/Deduplicator';
import { getOperationName } from '../src/queries/getFromAST';
describe('query deduplication', function () {
    it("does not affect different queries", function () {
        var document = (_a = ["query test1($x: String){\n      test(x: $x)\n    }"], _a.raw = ["query test1($x: String){\n      test(x: $x)\n    }"], gql(_a));
        var variables1 = { x: 'Hello World' };
        var variables2 = { x: 'Goodbye World' };
        var request1 = {
            query: document,
            variables: variables1,
            operationName: getOperationName(document),
        };
        var request2 = {
            query: document,
            variables: variables2,
            operationName: getOperationName(document),
        };
        var called = 0;
        var deduper = new Deduplicator({
            query: function () {
                called += 1;
                return new Promise(function (resolve, reject) {
                    setTimeout(resolve, 5);
                });
            },
        });
        deduper.query(request1);
        deduper.query(request2);
        assert.equal(called, 2);
        var _a;
    });
    it("will not deduplicate requests following an errored query", function () {
        var document = (_a = ["query test1($x: String){\n      test(x: $x)\n    }"], _a.raw = ["query test1($x: String){\n      test(x: $x)\n    }"], gql(_a));
        var variables = { x: 'Hello World' };
        var request = {
            query: document,
            variables: variables,
            operationName: getOperationName(document),
        };
        var called = 0;
        var deduper = new Deduplicator({
            query: function () {
                called += 1;
                switch (called) {
                    case 1:
                        return new Promise(function (resolve, reject) {
                            setTimeout(reject);
                        });
                    case 2:
                        return new Promise(function (resolve, reject) {
                            setTimeout(resolve);
                        });
                    default:
                        return assert(false, 'Should not have been called more than twice');
                }
            },
        });
        return deduper.query(request)
            .catch(function () {
            deduper.query(request);
            return assert.equal(called, 2);
        });
        var _a;
    });
    it("deduplicates identical queries", function () {
        var document = (_a = ["query test1($x: String){\n      test(x: $x)\n    }"], _a.raw = ["query test1($x: String){\n      test(x: $x)\n    }"], gql(_a));
        var variables1 = { x: 'Hello World' };
        var variables2 = { x: 'Hello World' };
        var request1 = {
            query: document,
            variables: variables1,
            operationName: getOperationName(document),
        };
        var request2 = {
            query: document,
            variables: variables2,
            operationName: getOperationName(document),
        };
        var called = 0;
        var deduper = new Deduplicator({
            query: function () {
                called += 1;
                return new Promise(function (resolve, reject) {
                    setTimeout(resolve, 5);
                });
            },
        });
        deduper.query(request1);
        deduper.query(request2);
        assert.equal(called, 1);
        var _a;
    });
    it("can bypass deduplication if desired", function () {
        var document = (_a = ["query test1($x: String){\n      test(x: $x)\n    }"], _a.raw = ["query test1($x: String){\n      test(x: $x)\n    }"], gql(_a));
        var variables1 = { x: 'Hello World' };
        var variables2 = { x: 'Hello World' };
        var request1 = {
            query: document,
            variables: variables1,
            operationName: getOperationName(document),
        };
        var request2 = {
            query: document,
            variables: variables2,
            operationName: getOperationName(document),
        };
        var called = 0;
        var deduper = new Deduplicator({
            query: function () {
                called += 1;
                return new Promise(function (resolve, reject) {
                    setTimeout(resolve, 5);
                });
            },
        });
        deduper.query(request1, false);
        deduper.query(request2, false);
        assert.equal(called, 2);
        var _a;
    });
});
//# sourceMappingURL=deduplicator.js.map