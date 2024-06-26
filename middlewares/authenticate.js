import { User } from '../models/user.js';
import HttpError from './HttpError.js';
import * as tokenServices from '../services/token-services.js';

async function auth(req, res, next) {
  const authorizationHeader = req.headers.authorization;

  if (typeof authorizationHeader !== 'string') {
    return next(HttpError(401, 'Not authorized!'));
  }

  const [bearer, token] = authorizationHeader.split(' ', 2);

  if (bearer !== 'Bearer') {
    return next(HttpError(401, 'Not authorized!'));
  }

  const userData = tokenServices.validateAccessToken(token);

  if (!userData) {
    return next(HttpError(401, 'Not authorized!'));
  }

    try {
      const user = await User.findById(userData.id);

      if (user === null) {
        return next(HttpError(401, 'Not authorized'));
      }

      if (user.token !== token) {
        return next(HttpError(401, 'Invalid token!'));
      }

      req.user = { id: user._id, email: user.email };

      next();
    } catch (error) {
      console.log(error);
      next(error);
    }
  
}

export default auth;
