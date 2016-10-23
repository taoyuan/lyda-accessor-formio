"use strict";

const assert = require('chai').assert;
const Formio = require('../');

describe('formio-accessor', function () {

  it('should initiate', function () {
    const formio = new Formio();
    assert.ok(formio);
  });

  it('should discover resources', function () {
    const formio = new Formio();
    return formio.discoverResources().then(resources => {
      assert.ok(resources.length);
    });
  });

  it.only('should discover schemas', function () {
    const formio = new Formio();
    return formio.discoverSchemas('demo').then(schema => {
      assert.ok(schema);
    });
  });
});
