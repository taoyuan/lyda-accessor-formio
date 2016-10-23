"use strict";

module.exports = function (ds) {
  ds.define('Form', {
    title: String,
    name: String,
    path: String,
    type: String,
    display: String,
    action: String,
    machineName: String,
    owner: String,
    components: [Object],
    submissionAccess: [Object],
    access: [Object],
    settings: [Object],
    tags: [String],
    created: Date,
    modified: Date,
    deleted: Date,
  }, {
    mongodb: {
      collection: 'forms'
    }
  })
};
