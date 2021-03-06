/**
 * Create an object whose properties behave like spreadsheet cells. A property whose value is a function behaves like
 * a spreadsheet formula, the value of the property is the result of executing the formula. A formula that refers to
 * other "cells" establishes dependencies that cause the formula to be recomputed.
 * @return {{}}
 */
import { Variable, addDaemon } from "@patrickdlogan/cstr";

/**
 *
 * @type {!WeakMap<!Proxy, !Object>}
 */
const metadata = new WeakMap();

function getMetadata(schema) {
    let meta = metadata.get(schema);
    if (meta === undefined) {
        meta = {};
        metadata.set(schema, meta);
    }
    return meta;
}

function metaSetTarget(schema, target) {
    const meta = getMetadata(schema);
    if (meta.target === undefined) {
        meta.target = target;
    }
}

/**
 *
 * @return {Object}
 */
function createSchema() {
    return new Proxy({}, {
        get: function (target, prop, receiver) {
            const variable = Reflect.get(target, prop, receiver);
            return (variable === undefined) ? undefined : variable.value;
        },

        set: function(target, prop, value, receiver) {
            const variable = Reflect.get(target, prop, receiver);
            if (variable === undefined) {
                let options;
                if (typeof value == "function") {
                    options = {
                        formula: value,
                        thisFormula: receiver
                    };
                    metaSetTarget(receiver, target);
                } else if (value instanceof PrimedFormula) {
                    options = {
                        value: value.value,
                        formula: value.formula,
                        thisFormula: receiver
                    }
                    metaSetTarget(receiver, target);
                } else {
                    options = {
                        value: value
                    }
                }
                const fresh = new Variable(options);
                Reflect.set(target, prop, fresh, receiver);
            } else if (typeof value == "function") {
                variable.formula = value;
                metaSetTarget(receiver, target);
            } else if (value instanceof PrimedFormula) {
                variable.formula = value.formula;
                metaSetTarget(receiver, target);
            } else {
                variable.value = value;
            }
            return true;
        }
    });
}

// TODO: proxy arrays as well

// TODO: depend on changes to a schema itself?

class PrimedFormula {
    /**
     *
     * @param {?} value
     * @param {!function(): ?}formula
     */
    constructor(value, formula) {
        this.value = value;
        this.formula = formula;
    }
}

/**
 * Return an initializer for the given formula such that a circular reference to the formula will return the given
 * value. This provides a way to approximate multi-way constraints. Note this primer takes affect when initializing
 * a new property on a schema. Updating a property on a schema will update the property to use the given formula but
 * circular references will return the properties current value and not the value of the primer.
 * @param {?} value
 * @param {!function(): ?} formula
 */
function primedFormula(value, formula) {
    return new PrimedFormula(value, formula);
}

function formulaValue(schema, prop, value) {
    const meta = getMetadata(schema);
    const obj = meta.target;
    if (obj !== undefined) {
        const variable = Reflect.get(obj, prop, schema);
        if (variable !== undefined) {
            variable.formulaValue = value;
        }
    }
}

function outOfDateDaemon(schema, prop, daemon) {
    const meta = getMetadata(schema);
    const obj = meta.target;
    if (obj !== undefined) {
        const variable = Reflect.get(obj, prop, schema);
        if (variable !== undefined) {
            variable.outOfDateDaemon = daemon;
        }
    }
}

export {
    createSchema, addDaemon, formulaValue, outOfDateDaemon, primedFormula
}