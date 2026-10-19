import express from 'express';
import createOrderRouter from './routes/create-order.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.use(createOrderRouter);


app.listen(3000, () => {
  console.log('Server is running on port 3000');
})