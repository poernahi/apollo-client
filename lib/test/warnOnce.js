import { assert, expect } from 'chai';
import { warnOnceInDevelopment } from '../src/util/warnOnce';
var lastWarning;
var keepEnv;
var numCalls = 0;
var oldConsoleWarn;
describe('warnOnce', function () {
    beforeEach(function () {
        keepEnv = process.env.NODE_ENV;
        numCalls = 0;
        lastWarning = null;
        oldConsoleWarn = console.warn;
        console.warn = function (msg) { numCalls++; lastWarning = msg; };
    });
    afterEach(function () {
        process.env.NODE_ENV = keepEnv;
        console.warn = oldConsoleWarn;
    });
    it('actually warns', function () {
        process.env.NODE_ENV = 'development';
        warnOnceInDevelopment('hi');
        assert(lastWarning === 'hi');
        expect(numCalls).to.equal(1);
    });
    it('does not warn twice', function () {
        process.env.NODE_ENV = 'development';
        warnOnceInDevelopment('ho');
        warnOnceInDevelopment('ho');
        expect(lastWarning).to.equal('ho');
        expect(numCalls).to.equal(1);
    });
    it('warns two different things once each', function () {
        process.env.NODE_ENV = 'development';
        warnOnceInDevelopment('slow');
        expect(lastWarning).to.equal('slow');
        warnOnceInDevelopment('mo');
        expect(lastWarning).to.equal('mo');
        expect(numCalls).to.equal(2);
    });
    it('does not warn in production', function () {
        process.env.NODE_ENV = 'production';
        warnOnceInDevelopment('lo');
        warnOnceInDevelopment('lo');
        expect(numCalls).to.equal(0);
    });
    it('warns many times in test', function () {
        process.env.NODE_ENV = 'test';
        warnOnceInDevelopment('yo');
        warnOnceInDevelopment('yo');
        expect(lastWarning).to.equal('yo');
        expect(numCalls).to.equal(2);
    });
});
//# sourceMappingURL=warnOnce.js.map