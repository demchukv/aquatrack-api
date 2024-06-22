import { User } from '../models/user.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import HttpError from '../middlewares/HttpError.js';
import { sendEmail } from '../helpers/sendEmail.js';
import * as tokenServices from '../services/token-services.js';
import axios from 'axios';
import queryString from 'query-string';

const { JWT_SECRET } = process.env;

const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      next(HttpError(409, 'Email in use!'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomUUID();

    const newUser = new User({
      email,
      password: hashedPassword,
      verificationToken,
    });
    await newUser.setAvatarURL(email);
    await newUser.save();

    const verifyEmailData = {
      to: email,
      subject: 'Verify email',
      html: `<h1>Please verify your email</h1><p><a target="_blank" href="${process.env.BASE_URI}/api/auth/verify/${verificationToken}">Click verify email</a></p>`,
    };
    await sendEmail(verifyEmailData);

    res.status(201).send({ user: { email: newUser.email } });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const logIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user === null) {
      next(HttpError(401, 'Email or password is wrong!'));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      next(HttpError(401, 'Email or password is wrong!'));
    }

    if (user.verify === false) {
      next(HttpError(401, 'Please verify your mail!'));
    }
    const payload = { id: user._id, email: user.email };
    const { token, refreshToken } = await tokenServices.generateToken(payload);
    await tokenServices.saveToken(user._id, refreshToken);

    await User.findByIdAndUpdate(user._id, { token }, { new: true });

    res.cookie('refreshToken', refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
    });

    res.status(200).send({ token, user: { email: user.email } });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const logOut = async (req, res, next) => {
  const { refreshToken } = req.cookies;
  try {
    await User.findByIdAndUpdate(req.user.id, { token: null }, { new: true });
    await tokenServices.removeToken(refreshToken);
    res.clearCookie('refreshToken');

    res.status(204).end();
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken: verificationToken });
  if (!user) {
    return res.status(404).json({
      message: 'User not found',
    });
  }
  try {
    await User.findByIdAndUpdate(user._id, {
      verify: true,
      verificationToken: null,
    });
    res.json({
      message: 'Verification successful',
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

const resendVerifyEmail = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      message: 'User not found',
    });
  }

  if (user.verify) {
    return res.status(400).json({
      message: 'Verification has already been passed',
    });
  }

  const verifyEmailData = {
    to: user.email,
    subject: 'Verify email',
    html: `<h1>Please verify your email</h1><p><a target="_blank" href="${process.env.BASE_URI}/api/auth/verify/${user.verificationToken}">Click verify email</a></p>`,
  };

  await sendEmail(verifyEmailData);

  res.json({ message: 'Verification email sent' });
};

const refresh = async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    next(HttpError(401, 'Not authorized'));
  }

  const userData = await tokenServices.refresh(refreshToken);
  res.cookie('refreshToken', userData.refreshToken, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  });
  return res
    .status(200)
    .send({ token: userData.token, user: { email: userData.user.email } });
};

const googleAuth = async (req, res, next) => {
  const stringifiedParams = queryString.stringify({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.BASE_URI + '/api/auth/google-redirect',
    scope: ['profile', 'email'].join(' '),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });

  return res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + stringifiedParams);
};

const googleRedirect = async (req, res, next) => {
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  const urlObj = new URL(fullUrl);
  const urlParams = queryString.parse(urlObj.search);
  const code = urlParams.code;

  const tokenData = await axios({
    url: 'https://oauth2.googleapis.com/token',
    method: 'post',
    data: queryString.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.BASE_URI + '/api/auth/google-redirect',
      grant_type: 'authorization_code',
      code,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const userData = await axios({
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    method: 'get',
    headers: {
      Authorization: `Bearer ${tokenData.data.access_token}`,
    },
  });

  const email = userData.data.email;
  const name = userData.data.given_name;
  const googleId = userData.data.id;
  const avatar = userData.data.picture;

  /*
  const user = await User.findOne({ email });
  if (!user) {
    const newUser = await User.create({
      email,
    })

    await newUser.setAvatarURL(email);
    */
  /**
  
   * TODO: Add verification
   * save to database et al.
   *   data: {
        id: '116374014050993346840',
        email: 'demchukv@gmail.com',
        verified_email: true,
        name: 'Volodymyr Demchuk',
        given_name: 'Volodymyr',
        family_name: 'Demchuk',
        picture: 'https://lh3.googleusercontent.com/a/ACg8ocL6Zx4vL9iqY0wD_Hr1sHYyaPgqXt_RWEIcQNcQ0sUi30HNEJjf6A=s96-c'
    }
   * send to frontend own token, not email!
  */
  return res.redirect(`${process.env.FRONTEND_URL}?email=${userData.data.email}`);
};

export { register, logIn, logOut, verifyEmail, resendVerifyEmail, refresh, googleAuth, googleRedirect };


/*
Code: 4/0ATx3LY5_9jApeG-qsT4jufw0kN_rZGLdMqsXaQFowAbj6cYLi8TO8_En4cNxyZaNULmSVQ

Token data:
{
  access_token: 'ya29.a0AXooCgtxaSyeanv9SAi0gllXgx4Rqt-dRXOV4FLCgcMjoX9YArUHQrD7-CeYu2GX79RlCNlGJPnaROMLWLgyIV4UtCU3OgLgTVjsPL4wo69bzmcFzlAtZ8ZofqHIPDMYMxrArjX_WblPF8OVl7qK7dMRtqKTPn8YTkI0aCgYKAXkSARASFQHGX2Mi6m7FSzGgFLyCTpPtw9V8HQ0171',
  expires_in: 3599,
  refresh_token: '1//09-TuhU_vDxuaCgYIARAAGAkSNwF-L9Ir_bxxaS078C7Onqm4Ip2Fh51BItrrzFeLPTaNInMOvkwdvrHG4-bGoBulBlab2hfDhak',
  scope: 'https://www.googleapis.com/auth/userinfo.profile openid https://www.googleapis.com/auth/userinfo.email',
  token_type: 'Bearer',
  id_token: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNkNTgwZjBhZjdhY2U2OThhMGNlZTdmMjMwYmNhNTk0ZGM2ZGJiNTUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI0MDQxOTI0NTMxODAtaWJuZzgydDNuOG5yNGZvZ3AxZGo3Y3Y1cHNkNW9kZDguYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI0MDQxOTI0NTMxODAtaWJuZzgydDNuOG5yNGZvZ3AxZGo3Y3Y1cHNkNW9kZDguYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTYzNzQwMTQwNTA5OTMzNDY4NDAiLCJlbWFpbCI6ImRlbWNodWt2QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJhdF9oYXNoIjoiLVFzZ0c0ejZ2YXg2emZGWi12Y1RFQSIsIm5hbWUiOiJWb2xvZHlteXIgRGVtY2h1ayIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMNlp4NHZMOWlxWTB3RF9IcjFzSFl5YVBncVh0X1JXRUljUU5jUTBzVWkzMEhORUpqZjZBPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6IlZvbG9keW15ciIsImZhbWlseV9uYW1lIjoiRGVtY2h1ayIsImlhdCI6MTcxOTA4MTIzNywiZXhwIjoxNzE5MDg0ODM3fQ.pBFYRKP5WZpbBsdnGNFhQhuGb03GjYNLKHnkJkX8zd0lRtMWbPR4NRC8PYyWxZjgcKi_-13-hmL82xW8hK7wHichb-gD3_u_nql3Yv5cUWnrohp3G2DM8VYW1Nj1zR3AI6pzCt2XgTxoP6H-WzQ4r59g0ISMfBnSbbi1O6B-Wxr4gRQ1hYBKa8Ql1aqipBQVFJ8saRw7EI6LRieHa5pFnYUObI-9mQrn3mbsbmKBjtER9lioBKAWfy6KxFerMYs1niCw6CRtz_f8ZzRiE8Z2aOGCyu1COsSMFe-Bd0npkRnhErD7iMBbp0Z8mMTfTgMzgfvCzIQaNLDNb8bAchcSPg'
}


User data:
{
  status: 200,
  statusText: 'OK',
  headers: Object [AxiosHeaders] {
    'cache-control': 'no-cache, no-store, max-age=0, must-revalidate',
    pragma: 'no-cache',
    expires: 'Mon, 01 Jan 1990 00:00:00 GMT',
    date: 'Sat, 22 Jun 2024 18:33:57 GMT',
    'content-type': 'application/json; charset=UTF-8',
    vary: 'Origin, X-Origin, Referer',
    server: 'ESF',
    'x-xss-protection': '0',
    'x-frame-options': 'SAMEORIGIN',
    'x-content-type-options': 'nosniff',
    'alt-svc': 'h3=":443"; ma=2592000,h3-29=":443"; ma=2592000',
    'transfer-encoding': 'chunked'
  },
  config: {
    transitional: {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    },
    adapter: [ 'xhr', 'http', 'fetch' ],
    transformRequest: [ [Function: transformRequest] ],
    transformResponse: [ [Function: transformResponse] ],
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    maxContentLength: -1,
    maxBodyLength: -1,
    env: { FormData: [Function], Blob: [class Blob] },
    validateStatus: [Function: validateStatus],
    headers: Object [AxiosHeaders] {
      Accept: 'application/json, text/plain, /*',
      'Content-Type': undefined,
      Authorization: 'Bearer ya29.a0AXooCgtxaSyeanv9SAi0gllXgx4Rqt-dRXOV4FLCgcMjoX9YArUHQrD7-CeYu2GX79RlCNlGJPnaROMLWLgyIV4UtCU3OgLgTVjsPL4wo69bzmcFzlAtZ8ZofqHIPDMYMxrArjX_WblPF8OVl7qK7dMRtqKTPn8YTkI0aCgYKAXkSARASFQHGX2Mi6m7FSzGgFLyCTpPtw9V8HQ0171',
      'User-Agent': 'axios/1.7.2',
      'Accept-Encoding': 'gzip, compress, deflate, br'
    },
    url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    method: 'get',
    data: undefined
  },
  request: <ref *1> ClientRequest {
    _events: [Object: null prototype] {
      abort: [Function (anonymous)],
      aborted: [Function (anonymous)],
      connect: [Function (anonymous)],
      error: [Function (anonymous)],
      socket: [Function (anonymous)],
      timeout: [Function (anonymous)],
      finish: [Function: requestOnFinish]
    },
    _eventsCount: 7,
    _maxListeners: undefined,
    outputData: [],
    outputSize: 0,
    writable: true,
    destroyed: true,
    _last: true,
    chunkedEncoding: false,
    shouldKeepAlive: true,
    maxRequestsOnConnectionReached: false,
    _defaultKeepAlive: true,
    useChunkedEncodingByDefault: false,
    sendDate: false,
    _removedConnection: false,
    _removedContLen: false,
    _removedTE: false,
    strictContentLength: false,
    _contentLength: 0,
    _hasBody: true,
    _trailer: '',
    finished: true,
    _headerSent: true,
    _closed: true,
    socket: TLSSocket {
      _tlsOptions: [Object],
      _secureEstablished: true,
      _securePending: false,
      _newSessionPending: false,
      _controlReleased: true,
      secureConnecting: false,
      _SNICallback: null,
      servername: 'www.googleapis.com',
      alpnProtocol: false,
      authorized: true,
      authorizationError: null,
      encrypted: true,
      _events: [Object: null prototype],
      _eventsCount: 9,
      connecting: false,
      _hadError: false,
      _parent: null,
      _host: 'www.googleapis.com',
      _closeAfterHandlingError: false,
      _readableState: [ReadableState],
      _writableState: [WritableState],
      allowHalfOpen: false,
      _maxListeners: undefined,
      _sockname: null,
      _pendingData: null,
      _pendingEncoding: '',
      server: undefined,
      _server: null,
      ssl: [TLSWrap],
      _requestCert: true,
      _rejectUnauthorized: true,
      timeout: 5000,
      parser: null,
      _httpMessage: null,
      autoSelectFamilyAttemptedAddresses: [Array],
      [Symbol(alpncallback)]: null,
      [Symbol(res)]: [TLSWrap],
      [Symbol(verified)]: true,
      [Symbol(pendingSession)]: null,
      [Symbol(async_id_symbol)]: -1,
      [Symbol(kHandle)]: [TLSWrap],
      [Symbol(lastWriteQueueSize)]: 0,
      [Symbol(timeout)]: Timeout {
        _idleTimeout: 5000,
        _idlePrev: [TimersList],
        _idleNext: [Timeout],
        _idleStart: 53956,
        _onTimeout: [Function: bound ],
        _timerArgs: undefined,
        _repeat: null,
        _destroyed: false,
        [Symbol(refed)]: false,
        [Symbol(kHasPrimitive)]: false,
        [Symbol(asyncId)]: 915,
        [Symbol(triggerId)]: 913
      },
      [Symbol(kBuffer)]: null,
      [Symbol(kBufferCb)]: null,
      [Symbol(kBufferGen)]: null,
      [Symbol(shapeMode)]: true,
      [Symbol(kCapture)]: false,
      [Symbol(kSetNoDelay)]: false,
      [Symbol(kSetKeepAlive)]: true,
      [Symbol(kSetKeepAliveInitialDelay)]: 1,
      [Symbol(kBytesRead)]: 0,
      [Symbol(kBytesWritten)]: 0,
      [Symbol(connect-options)]: [Object]
    },
    _header: 'GET /oauth2/v2/userinfo HTTP/1.1\r\n' +
      'Accept: application/json, text/plain, /*\r\n' +
      'Authorization: Bearer ya29.a0AXooCgtxaSyeanv9SAi0gllXgx4Rqt-dRXOV4FLCgcMjoX9YArUHQrD7-CeYu2GX79RlCNlGJPnaROMLWLgyIV4UtCU3OgLgTVjsPL4wo69bzmcFzlAtZ8ZofqHIPDMYMxrArjX_WblPF8OVl7qK7dMRtqKTPn8YTkI0aCgYKAXkSARASFQHGX2Mi6m7FSzGgFLyCTpPtw9V8HQ0171\r\n' +
      'User-Agent: axios/1.7.2\r\n' +
      'Accept-Encoding: gzip, compress, deflate, br\r\n' +
      'Host: www.googleapis.com\r\n' +
      'Connection: keep-alive\r\n' +
      '\r\n',
    _keepAliveTimeout: 0,
    _onPendingData: [Function: nop],
    agent: Agent {
      _events: [Object: null prototype],
      _eventsCount: 2,
      _maxListeners: undefined,
      defaultPort: 443,
      protocol: 'https:',
      options: [Object: null prototype],
      requests: [Object: null prototype] {},
      sockets: [Object: null prototype] {},
      freeSockets: [Object: null prototype],
      keepAliveMsecs: 1000,
      keepAlive: true,
      maxSockets: Infinity,
      maxFreeSockets: 256,
      scheduling: 'lifo',
      maxTotalSockets: Infinity,
      totalSocketCount: 2,
      maxCachedSessions: 100,
      _sessionCache: [Object],
      [Symbol(shapeMode)]: false,
      [Symbol(kCapture)]: false
    },
    socketPath: undefined,
    method: 'GET',
    maxHeaderSize: undefined,
    insecureHTTPParser: undefined,
    joinDuplicateHeaders: undefined,
    path: '/oauth2/v2/userinfo',
    _ended: true,
    res: IncomingMessage {
      _events: [Object],
      _readableState: [ReadableState],
      _maxListeners: undefined,
      socket: null,
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      httpVersion: '1.1',
      complete: true,
      rawHeaders: [Array],
      rawTrailers: [],
      joinDuplicateHeaders: undefined,
      aborted: false,
      upgrade: false,
      url: '',
      method: null,
      statusCode: 200,
      statusMessage: 'OK',
      client: [TLSSocket],
      _consuming: true,
      _dumped: false,
      req: [Circular *1],
      _eventsCount: 4,
      responseUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      redirects: [],
      [Symbol(shapeMode)]: true,
      [Symbol(kCapture)]: false,
      [Symbol(kHeaders)]: [Object],
      [Symbol(kHeadersCount)]: 30,
      [Symbol(kTrailers)]: null,
      [Symbol(kTrailersCount)]: 0
    },
    aborted: false,
    timeoutCb: null,
    upgradeOrConnect: false,
    parser: null,
    maxHeadersCount: null,
    reusedSocket: false,
    host: 'www.googleapis.com',
    protocol: 'https:',
    _redirectable: Writable {
      _events: [Object],
      _writableState: [WritableState],
      _maxListeners: undefined,
      _options: [Object],
      _ended: true,
      _ending: true,
      _redirectCount: 0,
      _redirects: [],
      _requestBodyLength: 0,
      _requestBodyBuffers: [],
      _eventsCount: 3,
      _onNativeResponse: [Function (anonymous)],
      _currentRequest: [Circular *1],
      _currentUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      [Symbol(shapeMode)]: true,
      [Symbol(kCapture)]: false
    },
    [Symbol(shapeMode)]: false,
    [Symbol(kCapture)]: false,
    [Symbol(kBytesWritten)]: 0,
    [Symbol(kNeedDrain)]: false,
    [Symbol(corked)]: 0,
    [Symbol(kOutHeaders)]: [Object: null prototype] {
      accept: [Array],
      authorization: [Array],
      'user-agent': [Array],
      'accept-encoding': [Array],
      host: [Array]
    },
    [Symbol(errored)]: null,
    [Symbol(kHighWaterMark)]: 16384,
    [Symbol(kRejectNonStandardBodyWrites)]: false,
    [Symbol(kUniqueHeaders)]: null
  },
  data: {
    id: '116374014050993346840',
    email: 'demchukv@gmail.com',
    verified_email: true,
    name: 'Volodymyr Demchuk',
    given_name: 'Volodymyr',
    family_name: 'Demchuk',
    picture: 'https://lh3.googleusercontent.com/a/ACg8ocL6Zx4vL9iqY0wD_Hr1sHYyaPgqXt_RWEIcQNcQ0sUi30HNEJjf6A=s96-c'
  }
}
*/