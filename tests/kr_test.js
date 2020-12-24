import * as kr from "../kr.mjs";
import test from 'tape';

test('create schema', function(t) {
    const schema = kr.createSchema();
    schema.x = 1;
    t.equal(Object.prototype.hasOwnProperty.call(schema, 'x'), true);
    schema.x = 10;
    t.equal(schema.x, 10);
    t.equal(schema['x'], 10);
    t.end();
});

test('out-of-date daemon executes whenever its variable is marked out of date', function(t) {
    const schema = kr.createSchema();
    schema.n = 0;
    schema.x = 0;
    schema.y = function() { return 10 * this.x; };
    kr.outOfDateDaemon(schema, 'y', function() { this.n++; });
    t.equals(schema.x, 0);
    t.equals(schema.y, 0);
    t.equals(schema.n, 0);
    schema.x = 1;
    t.equals(schema.n, 1);
    t.equals(schema.x, 1);
    t.equals(schema.y, 10);
    schema.x = 2;
    t.equals(schema.n, 2);
    t.equals(schema.x, 2);
    t.equals(schema.y, 20);
    t.end();
});

test('system daemon executes once and only once upon access of the next variable value', function(t) {
    const schema = kr.createSchema();
    kr.addDaemon(function() { schema.n++; });
    t.equals(schema.n, undefined);
    schema.n = 0;
    t.equals(schema.n, 1);
    schema.x = 0;
    t.equals(schema.n, 1);
    schema.y = function() { return 10 * this.x; };
    t.equals(schema.n, 1);
    t.equals(schema.x, 0);
    t.equals(schema.n, 1);
    t.equals(schema.y, 0);
    schema.x = 1;
    t.equals(schema.x, 1);
    t.equals(schema.y, 10);
    schema.x = 2;
    t.equals(schema.x, 2);
    t.equals(schema.y, 20);
    t.equals(schema.n, 1);
    t.end();
});

test('circular dependencies', function(t) {
    const converter = kr.createSchema();
    converter.celsius = kr.primedFormula(0.0, function() {
        return (this.fahrenheit - 32.0) / 1.8;
    });
    converter.fahrenheit = kr.primedFormula(32.0, function () {
        return (this.celsius * 1.8) + 32.0;
    });
    t.equal(converter.celsius, 0.0);
    t.equal(converter.fahrenheit, 32.0);
    kr.formulaValue(converter, 'celsius', 100.0);
    t.equal(converter.fahrenheit, 212.0);
    t.equal(converter.celsius, 100.0);
    kr.formulaValue(converter, 'fahrenheit', -459.67);
    t.equal(converter.fahrenheit, -459.67);
    t.equal(converter.celsius, -273.15);
    t.end();
});