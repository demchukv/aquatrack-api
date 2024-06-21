import express from "express";
import morgan from "morgan";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { createFolderIsNotExist } from "./helpers/upload.js";
import usersRouter from "./routes/usersRouter.js";
import contactsRouter from "./routes/contactsRouter.js";
import swaggerUi from 'swagger-ui-express';

import swaggerDocument from './openapi.json' assert { type: "json" };

const uploadDir = path.join(process.cwd(), "tmp");
const storeAvatar = path.join(process.cwd(), "public", "avatars");

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(morgan("tiny"));
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use("/api/users", usersRouter);
app.use("/api/contacts", contactsRouter);

app.use((_, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, _, res, __) => {
  const { status = 500, message = "Internal server error" } = err;
  res.status(status).json({ message });
});

const PORT = process.env.PORT || 3000;
const uriDb = process.env.DB_HOST;

const connection = mongoose.connect(uriDb);

connection
  .then(() => {
    app.listen(PORT, async function () {
      createFolderIsNotExist(uploadDir);
      createFolderIsNotExist(storeAvatar);
      console.log(`Database connection successful`);
    });
  })
  .catch((err) => {
    console.log(`Server not running. Error message: ${err.message}`);
    process.exit(1);
  });

  export default app;