(function () {
  const rst = [1, 2, 3, 4].map(function (a) {
    return a + 1;
  });

  console.log(rst);

  const user = { name: 'Jon' };
  console.log(user?.name);
})();
