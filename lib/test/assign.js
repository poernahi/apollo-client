import { assign } from '../src/util/assign';
import { assert } from 'chai';
describe('assign', function () {
    it('will merge many objects together', function () {
        assert.deepEqual(assign({ a: 1 }, { b: 2 }), { a: 1, b: 2 });
        assert.deepEqual(assign({ a: 1 }, { b: 2 }, { c: 3 }), { a: 1, b: 2, c: 3 });
        assert.deepEqual(assign({ a: 1 }, { b: 2 }, { c: 3 }, { d: 4 }), { a: 1, b: 2, c: 3, d: 4 });
    });
    it('will merge many objects together shallowly', function () {
        assert.deepEqual(assign({ x: { a: 1 } }, { x: { b: 2 } }), { x: { b: 2 } });
        assert.deepEqual(assign({ x: { a: 1 } }, { x: { b: 2 } }, { x: { c: 3 } }), { x: { c: 3 } });
        assert.deepEqual(assign({ x: { a: 1 } }, { x: { b: 2 } }, { x: { c: 3 } }, { x: { d: 4 } }), { x: { d: 4 } });
    });
    it('will mutate and return the source objects', function () {
        var source1 = { a: 1 };
        var source2 = { a: 1 };
        var source3 = { a: 1 };
        assert.strictEqual(assign(source1, { b: 2 }), source1);
        assert.strictEqual(assign(source2, { b: 2 }, { c: 3 }), source2);
        assert.strictEqual(assign(source3, { b: 2 }, { c: 3 }, { d: 4 }), source3);
        assert.deepEqual(source1, { a: 1, b: 2 });
        assert.deepEqual(source2, { a: 1, b: 2, c: 3 });
        assert.deepEqual(source3, { a: 1, b: 2, c: 3, d: 4 });
    });
});
//# sourceMappingURL=assign.js.map