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

// google auth --------------------------
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import cookieSession from 'cookie-session';
import { User } from './models/user.js';
// --------------------------------------

const uploadDir = path.join(process.cwd(), 'tmp');
const storeAvatar = path.join(process.cwd(), 'public', 'avatars');

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(morgan('tiny'));
app.use(cors());
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
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env

// cookie session ----------------------------------------
app.use(
  cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: ['cookie key'],
  })
);

// passport init 
app.use(passport.initialize())
app.use(passport.session())

// passport useage witth google strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      const existingUser = await User.findOne({ googleId: profile.id });
      if (existingUser) {
        return done(null, existingUser);
      }

      const newUser = await new User({
        googleId: profile.id,
        displayName: profile.displayName,
      }).save();
      done(null, newUser);
    }
  )
);

//
passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id)
  done(null, user)
})

// google auth path
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

// google callback elaboration path
app.get('/profile', (req, res) => {
  res.send(req.user)
})
// -------------------------------------------------------

const connection = mongoose.connect(uriDb, {
  useNewUrlParser: true, // google connection to MongoDB
  UseUnifiedTopology: true, // google connection to MongoDB
});

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
