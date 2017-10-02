import { assert } from 'chai';
import gql from 'graphql-tag';
import { IntrospectionFragmentMatcher } from '../src/data/fragmentMatcher';
describe('IntrospectionFragmentMatcher', function () {
    var introspectionQuery = (_a = ["{\n    __schema {\n      types {\n        kind\n        name\n        possibleTypes {\n          name\n        }\n      }\n    }\n  }"], _a.raw = ["{\n    __schema {\n      types {\n        kind\n        name\n        possibleTypes {\n          name\n        }\n      }\n    }\n  }"], gql(_a));
    it('will throw an error if match is called if it is not ready', function () {
        var ifm = new IntrospectionFragmentMatcher();
        assert.throws(function () { return ifm.match(); }, /called before/);
    });
    it('can be seeded with an introspection query result', function () {
        var ifm = new IntrospectionFragmentMatcher({
            introspectionQueryResultData: {
                __schema: {
                    types: [{
                            kind: 'UNION',
                            name: 'Item',
                            possibleTypes: [{
                                    name: 'ItemA',
                                }, {
                                    name: 'ItemB',
                                }],
                        }],
                },
            },
        });
        var store = {
            'a': {
                __typename: 'ItemB',
            },
        };
        var idValue = {
            type: 'id',
            id: 'a',
            generated: false,
        };
        var readStoreContext = {
            store: store,
            returnPartialData: false,
            hasMissingField: false,
            customResolvers: {},
        };
        assert.equal(ifm.match(idValue, 'Item', readStoreContext), true);
        assert.equal(ifm.match(idValue, 'NotAnItem', readStoreContext), false);
    });
    var _a;
});
//# sourceMappingURL=fragmentMatcher.js.map