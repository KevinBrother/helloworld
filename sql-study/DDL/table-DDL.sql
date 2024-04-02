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
    drinker char(10) REFERENCES Drinkers(name),
    bar char(20) REFERENCES Bars(name),
    PRIMARY KEY (drinker, bar)
)

create table Likes (
    drinker char(10) REFERENCES Drinkers(name),
    beer varchar(20) REFERENCES Beers(name),
    PRIMARY KEY (drinker, beer)
)

create table Sells (
    bar char(20) REFERENCES Bars(name),
    beer varchar(20) REFERENCES Beers(name),
    price REAL NOT NULL,
    PRIMARY KEY (beer, bar)
)