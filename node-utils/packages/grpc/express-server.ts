import express from 'express';


const app = express();

app.get('/', (req, res) => {

  const name = req.query.name;
  res.send({message: `Hello ${name}!`});
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}, http://localhost:${PORT}`);
});