import { addTypenameToDocument, } from '../src/queries/queryTransform';
import { getQueryDefinition, } from '../src/queries/getFromAST';
import { print } from 'graphql/language/printer';
import gql from 'graphql-tag';
import { assert } from 'chai';
describe('query transforms', function () {
    it('should correctly add typenames', function () {
        var testQuery = (_a = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n          }\n        }\n      }\n    "], _a.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n          }\n        }\n      }\n    "], gql(_a));
        var newQueryDoc = addTypenameToDocument(testQuery);
        var expectedQuery = (_b = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n          __typename\n        }\n      }\n    "], _b.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n          __typename\n        }\n      }\n    "], gql(_b));
        var expectedQueryStr = print(expectedQuery);
        assert.equal(expectedQueryStr, print(newQueryDoc));
        var _a, _b;
    });
    it('should not add duplicates', function () {
        var testQuery = (_a = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n        }\n      }\n    "], _a.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n        }\n      }\n    "], gql(_a));
        var newQueryDoc = addTypenameToDocument(testQuery);
        var expectedQuery = (_b = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n          __typename\n        }\n      }\n    "], _b.raw = ["\n      query {\n        author {\n          name {\n            firstName\n            lastName\n            __typename\n          }\n          __typename\n        }\n      }\n    "], gql(_b));
        var expectedQueryStr = print(expectedQuery);
        assert.equal(expectedQueryStr, print(newQueryDoc));
        var _a, _b;
    });
    it('should not screw up on a FragmentSpread within the query AST', function () {
        var testQuery = (_a = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n        }\n      }\n    }"], _a.raw = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n        }\n      }\n    }"], gql(_a));
        var expectedQuery = getQueryDefinition((_b = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n          __typename\n        }\n        __typename\n      }\n    }\n    "], _b.raw = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n          __typename\n        }\n        __typename\n      }\n    }\n    "], gql(_b)));
        var modifiedQuery = addTypenameToDocument(testQuery);
        assert.equal(print(expectedQuery), print(getQueryDefinition(modifiedQuery)));
        var _a, _b;
    });
    it('should modify all definitions in a document', function () {
        var testQuery = (_a = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n        }\n      }\n    }\n    fragment friendFields on User {\n      firstName\n      lastName\n    }"], _a.raw = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n        }\n      }\n    }\n    fragment friendFields on User {\n      firstName\n      lastName\n    }"], gql(_a));
        var newQueryDoc = addTypenameToDocument(testQuery);
        var expectedQuery = (_b = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n          __typename\n        }\n        __typename\n      }\n    }\n    fragment friendFields on User {\n      firstName\n      lastName\n      __typename\n    }"], _b.raw = ["\n    query withFragments {\n      user(id: 4) {\n        friends(first: 10) {\n          ...friendFields\n          __typename\n        }\n        __typename\n      }\n    }\n    fragment friendFields on User {\n      firstName\n      lastName\n      __typename\n    }"], gql(_b));
        assert.equal(print(expectedQuery), print(newQueryDoc));
        var _a, _b;
    });
    it('should be able to apply a QueryTransformer correctly', function () {
        var testQuery = (_a = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], _a.raw = ["\n    query {\n      author {\n        firstName\n        lastName\n      }\n    }"], gql(_a));
        var expectedQuery = getQueryDefinition((_b = ["\n    query {\n      author {\n        firstName\n        lastName\n        __typename\n      }\n    }\n    "], _b.raw = ["\n    query {\n      author {\n        firstName\n        lastName\n        __typename\n      }\n    }\n    "], gql(_b)));
        var modifiedQuery = addTypenameToDocument(testQuery);
        assert.equal(print(expectedQuery), print(getQueryDefinition(modifiedQuery)));
        var _a, _b;
    });
    it('should be able to apply a MutationTransformer correctly', function () {
        var testQuery = (_a = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n        }\n      }"], _a.raw = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n        }\n      }"], gql(_a));
        var expectedQuery = (_b = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n          __typename\n        }\n      }"], _b.raw = ["\n      mutation {\n        createAuthor(firstName: \"John\", lastName: \"Smith\") {\n          firstName\n          lastName\n          __typename\n        }\n      }"], gql(_b));
        var modifiedQuery = addTypenameToDocument(testQuery);
        assert.equal(print(expectedQuery), print(modifiedQuery));
        var _a, _b;
    });
    it('should add typename fields correctly on this one query', function () {
        var testQuery = (_a = ["\n        query Feed($type: FeedType!) {\n          # Eventually move this into a no fetch query right on the entry\n          # since we literally just need this info to determine whether to\n          # show upvote/downvote buttons\n          currentUser {\n            login\n          }\n          feed(type: $type) {\n            createdAt\n            score\n            commentCount\n            id\n            postedBy {\n              login\n              html_url\n            }\n\n            repository {\n              name\n              full_name\n              description\n              html_url\n              stargazers_count\n              open_issues_count\n              created_at\n              owner {\n                avatar_url\n              }\n            }\n          }\n        }"], _a.raw = ["\n        query Feed($type: FeedType!) {\n          # Eventually move this into a no fetch query right on the entry\n          # since we literally just need this info to determine whether to\n          # show upvote/downvote buttons\n          currentUser {\n            login\n          }\n          feed(type: $type) {\n            createdAt\n            score\n            commentCount\n            id\n            postedBy {\n              login\n              html_url\n            }\n\n            repository {\n              name\n              full_name\n              description\n              html_url\n              stargazers_count\n              open_issues_count\n              created_at\n              owner {\n                avatar_url\n              }\n            }\n          }\n        }"], gql(_a));
        var expectedQuery = getQueryDefinition((_b = ["\n      query Feed($type: FeedType!) {\n          currentUser {\n            login\n            __typename\n          }\n          feed(type: $type) {\n            createdAt\n            score\n            commentCount\n            id\n            postedBy {\n              login\n              html_url\n              __typename\n            }\n\n            repository {\n              name\n              full_name\n              description\n              html_url\n              stargazers_count\n              open_issues_count\n              created_at\n              owner {\n                avatar_url\n                __typename\n              }\n              __typename\n            }\n            __typename\n          }\n        }"], _b.raw = ["\n      query Feed($type: FeedType!) {\n          currentUser {\n            login\n            __typename\n          }\n          feed(type: $type) {\n            createdAt\n            score\n            commentCount\n            id\n            postedBy {\n              login\n              html_url\n              __typename\n            }\n\n            repository {\n              name\n              full_name\n              description\n              html_url\n              stargazers_count\n              open_issues_count\n              created_at\n              owner {\n                avatar_url\n                __typename\n              }\n              __typename\n            }\n            __typename\n          }\n        }"], gql(_b)));
        var modifiedQuery = addTypenameToDocument(testQuery);
        assert.equal(print(expectedQuery), print(getQueryDefinition(modifiedQuery)));
        var _a, _b;
    });
});
//# sourceMappingURL=queryTransform.js.map