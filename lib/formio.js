'use strict';

const g = require('strong-globalize')();
const _ = require('lodash');
const Promise = require('bluebird');
const {Accessor} = require('lyda-accessor');
const MongoDBAccessor = require('lyda-accessor-mongodb');

const debug = require('debug')('lyda:accessor:formio');

// const TYPE_IGNORES = ['htmlelement', 'signature', 'custom', 'button'];

const TYPE_MAPS = {
  String: ['textfield', 'password', 'textarea', 'radio', 'content', 'email', 'phoneNumber', 'address', 'hidden',
    'resource', 'file'],
  Number: ['number', 'currency'],
  Boolean: ['checkbox',],
  Object: ['selectboxes', 'survey'],
  Date: ['datetime'],
  [Object]: ['datagrid']
};

function typeMapper(componentType) {
  let result = null;
  _.forEach(TYPE_MAPS, (possibles, type) => {
    if (_.includes(possibles, componentType.toLowerCase())) {
      result = type;
      return false;
    }
  });

  return result;
}

class Formio extends Accessor {

  constructor(settings) {
    settings = _.assign({database: 'formioapp'}, settings);

    super('formio', settings);

    this.accessor = new MongoDBAccessor(settings);
    this.ds = this.accessor.ds;

    require('./models')(this.ds);
  }

  connect() {
    return Promise.fromCallback(cb => this.ds.connect(cb));
  }

  disconnect() {
    return Promise.fromCallback(cb => this.ds.disconnect(cb));
  }

  discoverResources(options) {
    options = options || {};

    const {Form} = this.ds.models;
    const where = {type: 'resource', deleted: null};
    if (options.owner) {
      where.owner = options.owner;
    }

    return this.connect().then(() => Form.find({where, fields: ['name', 'title', 'owner']}));
  }

  discoverSchemas(resourceName, options) {
    options = options || {};

    const {Form} = this.ds.models;
    const where = {name: {regexp: new RegExp(resourceName, 'i')}, type: 'resource', deleted: null};
    if (options.owner) {
      where.owner = options.owner;
    }

    return this.connect().then(() => Form.findOne({where})).then(form => {
      if (!form) {
        throw new Error(g.f('Can not find resource: %s', resourceName));
      }
      const schema = {
        id: form.id,
        name: form.name,
        columns: []
      };
      _.forEach(form.components, item => {
        const type = typeMapper(item.type);

        if (!type) { // unsupported type, ignore and continue
          debug(`Ignore ${item.name} column for unsupported type: ${item.type}`);
          return;
        }

        schema.columns.push({
          name: item.key,
          type: type,
          label: item.label || item.key
        });
      });
      return schema;
    });
  }

  aggregate(query, options) {
    options = Object.assign({
      namemapper: name => 'data.' + name
    }, options);

    normalize(query);
    query.collection = 'submissions';
    let where = {form: query.id};
    try {
      const objectId = this.ds.ObjectID(query.id);
      where = {$or: [{form: objectId}, where]}
    } catch (e) {}
    where.deleted = null;

    query.where = where;
    return this.accessor.aggregate(query, options);
  }

}

function normalize(query) {
  _.forEach(query.filters, normalizeField);
  _.forEach(query.orders, normalizeField);
  _.forEach(query.fields, normalizeField);
  _.forEach(query.additions, normalizeField);

  function normalizeField(field) {
    if (field.expression) {
      return;
    }
    const columnName = field.columnName || field.name; // filed is maybe column
    if (columnName) {
      field.columnName = 'data.' + columnName;
    }
  }
}

module.exports = Formio;
