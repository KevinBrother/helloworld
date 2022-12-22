var { graphql, buildSchema } = require('graphql');
var schema = buildSchema(`
  type Query {
    hello: String
  }
`);
const root = {
  hello: () => {
    return 'hello world!';
  }
};
module.exports = function (query) {
  return graphql({
    schema: schema,
    source: query,
    rootValue: root
  }).then((response) => {
    console.log(response);
    return response;
  });
};
