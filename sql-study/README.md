# SQL Study

## SQL 的四种语言 DDL、DML、DCL、TCL [参考链接](https://www.cnblogs.com/henryhappier/archive/2010/07/05/1771295.html)

- DDL（Data Definition Language）数据定义语言 ：定义数据，比如创建、修改、删除表、索引等。
  - create：创建数据库、表、索引等。
  - alter：修改表结构。
  - drop：删除数据库、表、索引等。
  - truncate：删除表中的数据，保留表结构。
  - comment：给表、字段添加注释。
  - grant：赋予用户权限。
  - revoke：收回用户权限。

- DML（Data Manipulation Language）数据操作语言 ：操作数据，比如插入、删除、更新数据。
  - insert：插入数据。
  - delete：删除数据。
  - update：更新数据。
  - select：查询数据。
  - merge：合并数据。
  - truncate：删除表中的数据，保留表结构。
  - lock：锁定表、行。
  - rollback：回滚事务。
  - commit：提交事务。

- DCL（Data Control Language）数据控制语言 ：控制数据，比如事务处理、权限管理等。
  - grant：赋予用户权限。
  - revoke：收回用户权限。

- TCL（Transaction Control Language）事务控制语言 ：事务处理语言，用于对数据库事务进行控制。
  - begin：开始事务。
  - commit：提交事务。
  - rollback：回滚事务。
  - savepoint：设置保存点。
  - set transaction：设置事务隔离级别。
  - set autocommit：设置自动提交。
