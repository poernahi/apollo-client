import { assert } from 'chai';
import { writeQueryToStore } from '../src/data/writeToStore';
import { readQueryFromStore } from '../src/data/readFromStore';
import { getFragmentDefinitions, createFragmentMap, } from '../src/queries/getFromAST';
import gql from 'graphql-tag';
import { withWarning, withError } from './util/wrap';
import { HeuristicFragmentMatcher, } from '../src/data/fragmentMatcher';
var fragmentMatcherFunction = new HeuristicFragmentMatcher().match;
describe('roundtrip', function () {
    it('real graphql result', function () {
        storeRoundtrip((_a = ["\n      {\n        people_one(id: \"1\") {\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        people_one(id: \"1\") {\n          name\n        }\n      }\n    "], gql(_a)), {
            people_one: {
                name: 'Luke Skywalker',
            },
        });
        var _a;
    });
    it('multidimensional array (#776)', function () {
        storeRoundtrip((_a = ["\n      {\n        rows {\n          value\n        }\n      }\n    "], _a.raw = ["\n      {\n        rows {\n          value\n        }\n      }\n    "], gql(_a)), {
            rows: [
                [
                    { value: 1 },
                    { value: 2 },
                ],
                [
                    { value: 3 },
                    { value: 4 },
                ],
            ],
        });
        var _a;
    });
    it('array with null values (#1551)', function () {
        storeRoundtrip((_a = ["\n      {\n        list {\n          value\n        }\n      }\n    "], _a.raw = ["\n      {\n        list {\n          value\n        }\n      }\n    "], gql(_a)), {
            list: [
                null,
                { value: 1 },
            ],
        });
        var _a;
    });
    it('enum arguments', function () {
        storeRoundtrip((_a = ["\n      {\n        hero(episode: JEDI) {\n          name\n        }\n      }\n    "], _a.raw = ["\n      {\n        hero(episode: JEDI) {\n          name\n        }\n      }\n    "], gql(_a)), {
            hero: {
                name: 'Luke Skywalker',
            },
        });
        var _a;
    });
    it('with an alias', function () {
        storeRoundtrip((_a = ["\n      {\n        luke: people_one(id: \"1\") {\n          name,\n        },\n        vader: people_one(id: \"4\") {\n          name,\n        }\n      }\n    "], _a.raw = ["\n      {\n        luke: people_one(id: \"1\") {\n          name,\n        },\n        vader: people_one(id: \"4\") {\n          name,\n        }\n      }\n    "], gql(_a)), {
            luke: {
                name: 'Luke Skywalker',
            },
            vader: {
                name: 'Darth Vader',
            },
        });
        var _a;
    });
    it('with variables', function () {
        storeRoundtrip((_a = ["\n      {\n        luke: people_one(id: $lukeId) {\n          name,\n        },\n        vader: people_one(id: $vaderId) {\n          name,\n        }\n      }\n    "], _a.raw = ["\n      {\n        luke: people_one(id: $lukeId) {\n          name,\n        },\n        vader: people_one(id: $vaderId) {\n          name,\n        }\n      }\n    "], gql(_a)), {
            luke: {
                name: 'Luke Skywalker',
            },
            vader: {
                name: 'Darth Vader',
            },
        }, {
            lukeId: '1',
            vaderId: '4',
        });
        var _a;
    });
    it('with GraphQLJSON scalar type', function () {
        storeRoundtrip((_a = ["\n      {\n        updateClub {\n          uid,\n          name,\n          settings\n        }\n      }\n    "], _a.raw = ["\n      {\n        updateClub {\n          uid,\n          name,\n          settings\n        }\n      }\n    "], gql(_a)), {
            updateClub: {
                uid: '1d7f836018fc11e68d809dfee940f657',
                name: 'Eple',
                settings: {
                    name: 'eple',
                    currency: 'AFN',
                    calendarStretch: 2,
                    defaultPreAllocationPeriod: 1,
                    confirmationEmailCopy: null,
                    emailDomains: null,
                },
            },
        });
        var _a;
    });
    describe('directives', function () {
        it('should be able to query with skip directive true', function () {
            storeRoundtrip((_a = ["\n        query {\n          fortuneCookie @skip(if: true)\n        }\n      "], _a.raw = ["\n        query {\n          fortuneCookie @skip(if: true)\n        }\n      "], gql(_a)), {});
            var _a;
        });
        it('should be able to query with skip directive false', function () {
            storeRoundtrip((_a = ["\n        query {\n          fortuneCookie @skip(if: false)\n        }\n      "], _a.raw = ["\n        query {\n          fortuneCookie @skip(if: false)\n        }\n      "], gql(_a)), { fortuneCookie: 'live long and prosper' });
            var _a;
        });
    });
    describe('fragments', function () {
        it('should work on null fields', function () {
            storeRoundtrip((_a = ["\n        query {\n          field {\n            ... on Obj {\n              stuff\n            }\n          }\n        }\n      "], _a.raw = ["\n        query {\n          field {\n            ... on Obj {\n              stuff\n            }\n          }\n        }\n      "], gql(_a)), {
                field: null,
            });
            var _a;
        });
        it('should work on basic inline fragments', function () {
            storeRoundtrip((_a = ["\n        query {\n          field {\n            __typename\n            ... on Obj {\n              stuff\n            }\n          }\n        }\n      "], _a.raw = ["\n        query {\n          field {\n            __typename\n            ... on Obj {\n              stuff\n            }\n          }\n        }\n      "], gql(_a)), {
                field: {
                    __typename: 'Obj',
                    stuff: 'Result',
                },
            });
            var _a;
        });
        it('should resolve on union types with inline fragments without typenames with warning', function () {
            return withWarning(function () {
                storeRoundtrip((_a = ["\n          query {\n            all_people {\n              name\n              ... on Jedi {\n                side\n              }\n              ... on Droid {\n                model\n              }\n            }\n          }"], _a.raw = ["\n          query {\n            all_people {\n              name\n              ... on Jedi {\n                side\n              }\n              ... on Droid {\n                model\n              }\n            }\n          }"], gql(_a)), {
                    all_people: [
                        {
                            name: 'Luke Skywalker',
                            side: 'bright',
                        },
                        {
                            name: 'R2D2',
                            model: 'astromech',
                        },
                    ],
                });
                var _a;
            }, /using fragments/);
        });
        it('should throw an error on two of the same inline fragment types', function () {
            return assert.throws(function () {
                storeRoundtrip((_a = ["\n          query {\n            all_people {\n              __typename\n              name\n              ... on Jedi {\n                side\n              }\n              ... on Jedi {\n                rank\n              }\n            }\n          }"], _a.raw = ["\n          query {\n            all_people {\n              __typename\n              name\n              ... on Jedi {\n                side\n              }\n              ... on Jedi {\n                rank\n              }\n            }\n          }"], gql(_a)), {
                    all_people: [
                        {
                            __typename: 'Jedi',
                            name: 'Luke Skywalker',
                            side: 'bright',
                        },
                    ],
                });
                var _a;
            }, /Can\'t find field rank on object/);
        });
        it('should resolve fields it can on interface with non matching inline fragments', function () {
            return withError(function () {
                storeRoundtrip((_a = ["\n          query {\n            dark_forces {\n              __typename\n              name\n              ... on Droid {\n                model\n              }\n            }\n          }"], _a.raw = ["\n          query {\n            dark_forces {\n              __typename\n              name\n              ... on Droid {\n                model\n              }\n            }\n          }"], gql(_a)), {
                    dark_forces: [
                        {
                            __typename: 'Droid',
                            name: '8t88',
                            model: '88',
                        },
                        {
                            __typename: 'Darth',
                            name: 'Anakin Skywalker',
                        },
                    ],
                });
                var _a;
            }, /IntrospectionFragmentMatcher/);
        });
        it('should resolve on union types with spread fragments', function () {
            return withError(function () {
                storeRoundtrip((_a = ["\n          fragment jediFragment on Jedi {\n            side\n          }\n\n          fragment droidFragment on Droid {\n            model\n          }\n\n          query {\n            all_people {\n              __typename\n              name\n              ...jediFragment\n              ...droidFragment\n            }\n          }"], _a.raw = ["\n          fragment jediFragment on Jedi {\n            side\n          }\n\n          fragment droidFragment on Droid {\n            model\n          }\n\n          query {\n            all_people {\n              __typename\n              name\n              ...jediFragment\n              ...droidFragment\n            }\n          }"], gql(_a)), {
                    all_people: [
                        {
                            __typename: 'Jedi',
                            name: 'Luke Skywalker',
                            side: 'bright',
                        },
                        {
                            __typename: 'Droid',
                            name: 'R2D2',
                            model: 'astromech',
                        },
                    ],
                });
                var _a;
            }, /IntrospectionFragmentMatcher/);
        });
        it('should work with a fragment on the actual interface or union', function () {
            return withError(function () {
                storeRoundtrip((_a = ["\n          fragment jediFragment on Character {\n            side\n          }\n\n          fragment droidFragment on Droid {\n            model\n          }\n\n          query {\n            all_people {\n              name\n              __typename\n              ...jediFragment\n              ...droidFragment\n            }\n          }"], _a.raw = ["\n          fragment jediFragment on Character {\n            side\n          }\n\n          fragment droidFragment on Droid {\n            model\n          }\n\n          query {\n            all_people {\n              name\n              __typename\n              ...jediFragment\n              ...droidFragment\n            }\n          }"], gql(_a)), {
                    all_people: [
                        {
                            __typename: 'Jedi',
                            name: 'Luke Skywalker',
                            side: 'bright',
                        },
                        {
                            __typename: 'Droid',
                            name: 'R2D2',
                            model: 'astromech',
                        },
                    ],
                });
                var _a;
            }, /IntrospectionFragmentMatcher/);
        });
        it('should throw on error on two of the same spread fragment types', function () {
            assert.throws(function () {
                return storeRoundtrip((_a = ["\n          fragment jediSide on Jedi {\n            side\n          }\n          fragment jediRank on Jedi {\n            rank\n          }\n          query {\n            all_people {\n              __typename\n              name\n              ...jediSide\n              ...jediRank\n            }\n          }"], _a.raw = ["\n          fragment jediSide on Jedi {\n            side\n          }\n          fragment jediRank on Jedi {\n            rank\n          }\n          query {\n            all_people {\n              __typename\n              name\n              ...jediSide\n              ...jediRank\n            }\n          }"], gql(_a)), {
                    all_people: [
                        {
                            __typename: 'Jedi',
                            name: 'Luke Skywalker',
                            side: 'bright',
                        },
                    ],
                });
                var _a;
            }, /Can\'t find field rank on object/);
        });
        it('should resolve on @include and @skip with inline fragments', function () {
            storeRoundtrip((_a = ["\n        query {\n          person {\n            name\n            __typename\n            ... on Jedi @include(if: true) {\n              side\n            }\n            ... on Droid @skip(if: true) {\n              model\n            }\n          }\n        }"], _a.raw = ["\n        query {\n          person {\n            name\n            __typename\n            ... on Jedi @include(if: true) {\n              side\n            }\n            ... on Droid @skip(if: true) {\n              model\n            }\n          }\n        }"], gql(_a)), {
                person: {
                    __typename: 'Jedi',
                    name: 'Luke Skywalker',
                    side: 'bright',
                },
            });
            var _a;
        });
        it('should resolve on @include and @skip with spread fragments', function () {
            storeRoundtrip((_a = ["\n        fragment jediFragment on Jedi {\n          side\n        }\n\n        fragment droidFragment on Droid {\n          model\n        }\n\n        query {\n          person {\n            name\n            __typename\n            ...jediFragment @include(if: true)\n            ...droidFragment @skip(if: true)\n          }\n        }"], _a.raw = ["\n        fragment jediFragment on Jedi {\n          side\n        }\n\n        fragment droidFragment on Droid {\n          model\n        }\n\n        query {\n          person {\n            name\n            __typename\n            ...jediFragment @include(if: true)\n            ...droidFragment @skip(if: true)\n          }\n        }"], gql(_a)), {
                person: {
                    __typename: 'Jedi',
                    name: 'Luke Skywalker',
                    side: 'bright',
                },
            });
            var _a;
        });
    });
});
function storeRoundtrip(query, result, variables) {
    if (variables === void 0) { variables = {}; }
    var fragmentMap = createFragmentMap(getFragmentDefinitions(query));
    var store = writeQueryToStore({
        result: result,
        query: query,
        variables: variables,
        fragmentMap: fragmentMap,
    });
    var reconstructedResult = readQueryFromStore({
        store: store,
        query: query,
        variables: variables,
        fragmentMatcherFunction: fragmentMatcherFunction,
    });
    assert.deepEqual(reconstructedResult, result);
}
//# sourceMappingURL=roundtrip.js.map