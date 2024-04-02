# mysql 需要显示申明外键，因此需要在创建表时指定外键约束。
## 建表语句如下：
## TODO 生成并查看数据库表关系图 （create EER model from database）
create table Beers (
    name varchar(20) PRIMARY KEY,
    manf varchar(40) NOT NULL
);

create table Bars (
    name char(20) PRIMARY KEY,
    addr varchar(40) NOT NULL,
    license int NOT NULL
)

create table Drinkers (
    name char(10) PRIMARY KEY,
    addr varchar(40),
    phone char(8)
)

create table Frequents (
    drinker char(10),
    bar char(20),
    Foreign Key (drinker) REFERENCES Drinkers(name),
    Foreign Key (bar) REFERENCES Bars(name),
    PRIMARY KEY (drinker, bar)
)

create table Likes (
    drinker char(10),
    beer varchar(20),
    Foreign Key (drinker) REFERENCES Drinkers(name),
    Foreign Key (beer) REFERENCES Beers(name),
    PRIMARY KEY (drinker, beer)
)

create table Sells (
    bar char(20),
    beer varchar(20),
    price REAL NOT NULL,
    Foreign Key (bar) REFERENCES Bars(name),
    Foreign Key (beer) REFERENCES Beers(name),
    PRIMARY KEY (beer, bar)
)