'use strict';

var helper = require('./test-helper'),
    _      = require('lodash'),
    Table  = require('../lib/table'),
    Schema = require('../lib/schema'),
    Query  = require('../lib//query'),
    Scan   = require('../lib//scan'),
    Item   = require('../lib/item'),
    chai   = require('chai'),
    expect = chai.expect;

chai.should();

describe('table', function () {
  var schema,
      table,
      serializer,
      dynamodb;

  beforeEach(function () {
    schema = new Schema();
    serializer = helper.mockSerializer(),
    dynamodb = helper.mockDynamoDB();
  });

  describe('#get', function () {

    it('should get item by hash key', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'}
        }
      };

      var resp = {
        Item : {email: {S : 'test@test.com'}, name: {S: 'test dude'}}
      };

      dynamodb.getItem.withArgs(request).yields(null, resp);

      serializer.buildKey.returns({email: resp.Item.email});

      serializer.deserializeItem.withArgs(schema, resp.Item).returns({email : 'test@test.com', name : 'test dude'});

      table.get('test@test.com', function (err, account) {
        account.should.be.instanceof(Item);
        account.get('email').should.equal('test@test.com');
        account.get('name').should.equal('test dude');

        done();
      });
    });

    it('should get item by hash and range key', function (done) {
      schema.String('name', {hashKey: true});
      schema.String('email', {rangeKey: true});
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          name  : {S : 'Tim Tester'},
          email : {S : 'test@test.com'}
        }
      };

      var resp = {
        Item : {email: {S : 'test@test.com'}, name: {S: 'Tim Tester'}}
      };

      dynamodb.getItem.withArgs(request).yields(null, resp);

      serializer.buildKey.returns({email: resp.Item.email, name : resp.Item.name});

      serializer.deserializeItem.withArgs(schema, resp.Item).returns({email : 'test@test.com', name : 'Tim Tester'});

      table.get('Tim Tester', 'test@test.com', function (err, account) {
        account.should.be.instanceof(Item);
        serializer.buildKey.calledWith('Tim Tester', 'test@test.com', schema).should.be.true;

        account.get('email').should.equal('test@test.com');
        account.get('name').should.equal('Tim Tester');

        done();
      });
    });

    it('should get item by hash key and options', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'}
        },
        ConsistentRead: true
      };

      var resp = {
        Item : {email: {S : 'test@test.com'}, name: {S: 'test dude'}}
      };

      dynamodb.getItem.withArgs(request).yields(null, resp);

      serializer.buildKey.returns({email: resp.Item.email});

      serializer.deserializeItem.withArgs(schema, resp.Item).returns({email : 'test@test.com', name : 'test dude'});

      table.get('test@test.com', {ConsistentRead: true}, function (err, account) {
        account.should.be.instanceof(Item);
        account.get('email').should.equal('test@test.com');
        account.get('name').should.equal('test dude');

        done();
      });
    });

    it('should get item by hashkey, range key and options', function (done) {
      schema.String('name', {hashKey: true});
      schema.String('email', {rangeKey: true});
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          name  : {S : 'Tim Tester'},
          email : {S : 'test@test.com'}
        },
        ConsistentRead: true
      };

      var resp = {
        Item : {email: {S : 'test@test.com'}, name: {S: 'Tim Tester'}}
      };

      dynamodb.getItem.withArgs(request).yields(null, resp);

      serializer.buildKey.returns({email: resp.Item.email, name : resp.Item.name});

      serializer.deserializeItem.withArgs(schema, resp.Item).returns({email : 'test@test.com', name : 'Tim Tester'});

      table.get('Tim Tester', 'test@test.com', {ConsistentRead: true}, function (err, account) {
        account.should.be.instanceof(Item);
        serializer.buildKey.calledWith('Tim Tester', 'test@test.com', schema).should.be.true;

        account.get('email').should.equal('test@test.com');
        account.get('name').should.equal('Tim Tester');

        done();
      });
    });
  });

  describe('#create', function () {

    it('should create valid item', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Item : {
          email : {S : 'test@test.com'},
          name  : {S : 'Tim Test'},
          age   : {N : '23'}
        }
      };

      var item = {email : 'test@test.com', name : 'Tim Test', age : 23};
      dynamodb.putItem.withArgs(request).yields(null, {});

      serializer.serializeItem.withArgs(schema, item).returns(request.Item);

      table.create(item, function (err, account) {
        account.should.be.instanceof(Item);

        account.get('email').should.equal('test@test.com');
        account.get('name').should.equal('Tim Test');

        done();
      });
    });

    it('should call apply defaults', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name', {default: 'Foo'});
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Item : {
          email : {S : 'test@test.com'},
          name  : {S : 'Foo'},
          age   : {N : '23'}
        }
      };

      var item = {email : 'test@test.com', name : 'Foo', age : 23};
      dynamodb.putItem.withArgs(request).yields(null, {});

      serializer.serializeItem.withArgs(schema, item).returns(request.Item);

      table.create({email : 'test@test.com', age: 23}, function (err, account) {
        account.should.be.instanceof(Item);

        account.get('email').should.equal('test@test.com');
        account.get('name').should.equal('Foo');

        done();
      });
    });

  });

  describe('#update', function () {

    it('should update valid item', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'}
        },
        AttributeUpdates : {
          email : {Action : 'PUT', Value: {S : 'test@test.com'}},
          name  : {Action : 'PUT', Value: {S : 'Tim Test'}},
          age   : {Action : 'PUT', Value: {N : '23'}}
        },
        ReturnValues: 'ALL_NEW'
      };

      var returnedAttributes = {
        email  : {S : 'test@test.com'},
        name   : {S : 'Tim Test'},
        age    : {N : '25'},
        scores : {NS : ['97', '86']}
      };

      var item = {email : 'test@test.com', name : 'Tim Test', age : 23};

      serializer.buildKey.returns(request.Key);
      serializer.serializeItemForUpdate.withArgs(schema, 'PUT', item).returns(request.AttributeUpdates);

      var returnedItem = _.merge({}, item, {scores: [97, 86]});
      serializer.deserializeItem.withArgs(schema, returnedAttributes).returns(returnedItem);
      dynamodb.updateItem.withArgs(request).yields(null, {Attributes: returnedAttributes});

      table.update(item, function (err, account) {
        account.should.be.instanceof(Item);

        account.get('email').should.equal('test@test.com');
        account.get('name').should.equal('Tim Test');
        account.get('age').should.equal(23);
        account.get('scores').should.eql([97, 86]);

        done();
      });
    });

    it('should update with passed in options', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'}
        },
        AttributeUpdates : {
          email : {Action : 'PUT', Value: {S : 'test@test.com'}},
          name  : {Action : 'PUT', Value: {S : 'Tim Test'}},
          age   : {Action : 'PUT', Value: {N : '23'}}
        },
        ReturnValues: 'ALL_OLD',
        Expected : {
          name : {'Value' : {S : 'Foo Bar'}}
        }
      };

      var returnedAttributes = {
        email  : {S : 'test@test.com'},
        name   : {S : 'Tim Test'},
        age    : {N : '25'},
        scores : {NS : ['97', '86']}
      };

      var item = {email : 'test@test.com', name : 'Tim Test', age : 23};

      serializer.buildKey.returns(request.Key);
      serializer.serializeItemForUpdate.withArgs(schema, 'PUT', item).returns(request.AttributeUpdates);

      var returnedItem = _.merge({}, item, {scores: [97, 86]});
      serializer.deserializeItem.withArgs(schema, returnedAttributes).returns(returnedItem);
      dynamodb.updateItem.withArgs(request).yields(null, {Attributes: returnedAttributes});

      serializer.serializeItem.withArgs(schema, {name: 'Foo Bar'}, {expected: true}).returns(request.Expected);

      table.update(item, {ReturnValues: 'ALL_OLD', expected: {name: 'Foo Bar'}}, function (err, account) {
        account.should.be.instanceof(Item);

        account.get('email').should.equal('test@test.com');
        account.get('name').should.equal('Tim Test');
        account.get('age').should.equal(23);
        account.get('scores').should.eql([97, 86]);

        done();
      });
    });
  });

  describe('#query', function () {

    it('should return query object', function () {
      schema.String('name', {hashKey: true});
      schema.String('email', {rangeKey: true});

      table = new Table('accounts', schema, serializer, dynamodb);

      table.query('Bob').should.be.instanceof(Query);
    });
  });

  describe('#scan', function () {

    it('should return scan object', function () {
      schema.String('name', {hashKey: true});
      schema.String('email', {rangeKey: true});

      table = new Table('accounts', schema, serializer, dynamodb);

      table.scan().should.be.instanceof(Scan);
    });
  });

  describe('#destroy', function () {

    it('should destroy valid item', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'}
        }
      };

      dynamodb.deleteItem.yields(null, {});

      serializer.buildKey.returns(request.Key);

      table.destroy('test@test.com', function () {
        serializer.buildKey.calledWith('test@test.com', null, schema).should.be.true;
        dynamodb.deleteItem.calledWith(request).should.be.true;

        done();
      });
    });

    it('should take optional params', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'}
        },
        ReturnValues : 'ALL_OLD'
      };

      dynamodb.deleteItem.yields(null, {});

      serializer.buildKey.returns(request.Key);

      table.destroy('test@test.com', {ReturnValues: 'ALL_OLD'}, function () {
        serializer.buildKey.calledWith('test@test.com', null, schema).should.be.true;
        dynamodb.deleteItem.calledWith(request).should.be.true;

        done();
      });
    });

    it('should parse and return attributes', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'}
        },
        ReturnValues : 'ALL_OLD'
      };

      var returnedAttributes = {
        email : {S : 'test@test.com'},
        name  : {S : 'Foo Bar'}
      };

      dynamodb.deleteItem.yields(null, {Attributes: returnedAttributes});

      serializer.buildKey.returns(request.Key);
      serializer.deserializeItem.withArgs(schema, returnedAttributes).returns(
        {email : 'test@test.com', name: 'Foo Bar'
      });

      table.destroy('test@test.com', {ReturnValues: 'ALL_OLD'}, function (err, item) {
        serializer.buildKey.calledWith('test@test.com', null, schema).should.be.true;
        dynamodb.deleteItem.calledWith(request).should.be.true;

        item.get('name').should.equal('Foo Bar');

        done();
      });
    });

    it('should accept hash and range key', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name', {rangeKey: true});
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'},
          name : {S : 'Foo Bar'}
        }
      };

      var returnedAttributes = {
        email : {S : 'test@test.com'},
        name  : {S : 'Foo Bar'}
      };

      dynamodb.deleteItem.yields(null, {Attributes: returnedAttributes});

      serializer.buildKey.returns(request.Key);
      serializer.deserializeItem.withArgs(schema, returnedAttributes).returns(
        {email : 'test@test.com', name: 'Foo Bar'
      });

      table.destroy('test@test.com', 'Foo Bar', function (err, item) {
        serializer.buildKey.calledWith('test@test.com', 'Foo Bar', schema).should.be.true;
        dynamodb.deleteItem.calledWith(request).should.be.true;

        item.get('name').should.equal('Foo Bar');

        done();
      });
    });

    it('should accept hashkey rangekey and options', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name', {rangeKey: true});
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'},
          name : {S : 'Foo Bar'}
        },
        ReturnValues : 'ALL_OLD'
      };

      var returnedAttributes = {
        email : {S : 'test@test.com'},
        name  : {S : 'Foo Bar'}
      };

      dynamodb.deleteItem.yields(null, {Attributes: returnedAttributes});

      serializer.buildKey.returns(request.Key);
      serializer.deserializeItem.withArgs(schema, returnedAttributes).returns(
        {email : 'test@test.com', name: 'Foo Bar'
      });

      table.destroy('test@test.com', 'Foo Bar', {ReturnValues: 'ALL_OLD'}, function (err, item) {
        serializer.buildKey.calledWith('test@test.com', 'Foo Bar', schema).should.be.true;
        dynamodb.deleteItem.calledWith(request).should.be.true;

        item.get('name').should.equal('Foo Bar');

        done();
      });
    });

    it('should serialize expected option', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');
      schema.Number('age');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        Key : {
          email : {S : 'test@test.com'}
        },
        Expected : {
          name : {'Value' : {S : 'Foo Bar'}}
        }
      };

      dynamodb.deleteItem.yields(null, {});

      serializer.serializeItem.withArgs(schema, {name: 'Foo Bar'}, {expected : true}).returns(request.Expected);
      serializer.buildKey.returns(request.Key);

      table.destroy('test@test.com', {expected: {name : 'Foo Bar'}}, function () {
        serializer.buildKey.calledWith('test@test.com', null, schema).should.be.true;
        dynamodb.deleteItem.calledWith(request).should.be.true;

        done();
      });
    });
  });

  describe('#createTable', function () {
    it('should create table with hash key', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        AttributeDefinitions : [
          { AttributeName: 'email', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      };

      dynamodb.createTable.yields(null, {});

      table.createTable({readCapacity : 5, writeCapacity: 5}, function (err) {
        expect(err).to.be.null;
        dynamodb.createTable.calledWith(request).should.be.true;
        done();
      });

    });

    it('should create table with range key', function (done) {
      schema.String('name', {hashKey: true});
      schema.String('email', {rangeKey: true});

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        AttributeDefinitions : [
          { AttributeName: 'name', AttributeType: 'S' },
          { AttributeName: 'email', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'name', KeyType: 'HASH' },
          { AttributeName: 'email', KeyType: 'RANGE' }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      };

      dynamodb.createTable.yields(null, {});

      table.createTable({readCapacity : 5, writeCapacity: 5}, function (err) {
        expect(err).to.be.null;
        dynamodb.createTable.calledWith(request).should.be.true;
        done();
      });

    });

    it('should create table with secondary index', function (done) {
      schema.String('name', {hashKey: true});
      schema.String('email', {rangeKey: true});
      schema.Number('age', {secondaryIndex: true});

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        AttributeDefinitions : [
          { AttributeName: 'name', AttributeType: 'S' },
          { AttributeName: 'email', AttributeType: 'S' },
          { AttributeName: 'age', AttributeType: 'N' }
        ],
        KeySchema: [
          { AttributeName: 'name', KeyType: 'HASH' },
          { AttributeName: 'email', KeyType: 'RANGE' }
        ],
        LocalSecondaryIndexes : [
          {
            IndexName : 'ageIndex',
            KeySchema: [
              { AttributeName: 'name', KeyType: 'HASH' },
              { AttributeName: 'age', KeyType: 'RANGE' }
            ],
            Projection : {
              ProjectionType : 'ALL'
            }
          }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      };

      dynamodb.createTable.yields(null, {});

      table.createTable({readCapacity : 5, writeCapacity: 5}, function (err) {
        expect(err).to.be.null;
        dynamodb.createTable.calledWith(request).should.be.true;
        done();
      });
    });

  });

  describe('#describeTable', function () {

    it('should make describe table request', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts'
      };

      dynamodb.describeTable.yields(null, {});

      table.describeTable(function (err) {
        expect(err).to.be.null;
        dynamodb.describeTable.calledWith(request).should.be.true;
        done();
      });
    });

  });
  describe('#updateTable', function () {

    it('should make update table request', function (done) {
      schema.String('email', {hashKey: true});
      schema.String('name');

      table = new Table('accounts', schema, serializer, dynamodb);

      var request = {
        TableName: 'accounts',
        ProvisionedThroughput: { ReadCapacityUnits: 4, WriteCapacityUnits: 2 }
      };

      dynamodb.updateTable.yields(null, {});

      table.updateTable({readCapacity: 4, writeCapacity: 2}, function (err) {
        expect(err).to.be.null;
        dynamodb.updateTable.calledWith(request).should.be.true;
        done();
      });
    });
  });

});

