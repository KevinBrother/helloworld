class Con {
    query(str: string, fn: (str: string) => void) {
      setTimeout(() => fn(str), Math.ceil(Math.random() * 1000));
    }
  }
  
  const connection = new Con();
  
  const queryPromise = (str: string) => {
    return new Promise<string>((resolve, reject) => {
      connection.query(str, (result) => {
        resolve(result);
      });
    });
  };
  
  let maxConnections = 3;
  let count = 100;
  let index = 0;
  
  function doQuery(current: number) {
      try {
          console.log("剩余连接数：", maxConnections);
          maxConnections--;
          queryPromise(`select * from user where id = ${current}`)
            .then((rst) => {
              maxConnections++;
              console.log(current + ": " + rst, maxConnections);
              if (index < count && maxConnections >= 0) {
                doQuery(index++);
              }
            })
            .finally(() => {
              maxConnections++;
            });
        } catch (error) {
          console.error(current + ": " + error);
        }
  }
  
  function run() {
    const max = maxConnections;
    for (let j = 0; j < max; j++) {
      doQuery(index++);
    }
  }
  
  run();
  