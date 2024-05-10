# mongodb 常用操作

``` sql

// 集合操作
use bilibili;
db;
db.createCollection('user');
db.createCollection('account');
db.getCollectionNames();
db.user.renameCollection('users');
db.account.drop();
db.getCollectionNames();


// 文档操作

db.users.insertOne({name: '张三', age: 25});
db.users.insertMany([
    {name: '李四', age: 21},
    {name: '王五', age: 22},
    {name: '赵六', age: 22}
]);

db.users.find();
db.users.findOne();
db.users.find({age: 22});
db.users.findOne({age: 22});


db.users.updateOne({name: '张三'}, {$set: {age: 21}});
db.users.updateMany({age: {$gt: 20}}, {$set: {age: 25}});

db.users.deleteOne({name: '王五'});
db.users.deleteMany({age: {$gt: 20}});
db.users.deleteMany({});
```
