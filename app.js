import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';

import { createFolderIsNotExist } from './helpers/upload.js';

import auth from './middlewares/authenticate.js';

import authRouter from './routes/authRouter.js';
import usersRouter from './routes/usersRouter.js';
import watersRouter from './routes/watersRouter.js';

import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './openapi.json' assert { type: 'json' };

import cookieParser from 'cookie-parser';

const uploadDir = path.join(process.cwd(), 'tmp');
const storeAvatar = path.join(process.cwd(), 'public', 'avatars');

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(morgan('tiny'));
app.use(cors({
  credentials: true,
  origin: [process.env.FRONTEND_URI, 'http://localhost:3000', 'http://localhost:5173'],
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/water', auth, watersRouter);

app.use((_, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, _, res, __) => {
  console.log(err);
  const { status = 500, message = 'Internal server error' } = err;
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 8080;
const uriDb = process.env.DB_HOST;

const connection = mongoose.connect(uriDb, {});

connection
  .then(() => {
    app.listen(PORT, async function () {
      createFolderIsNotExist(uploadDir);
      createFolderIsNotExist(storeAvatar);
      console.log(`Database connection successful`);
      console.log(`Server running on port ${PORT}`);
      console.log(`Swagger UI is available at ${process.env.BASE_URI}/api-docs`);
    });
  })
  .catch(err => {
    console.log(`Server not running. Error message: ${err.message}`);
    process.exit(1);
  });

export default app;
