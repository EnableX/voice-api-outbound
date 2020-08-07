// core modules
const { request } = require('https');
// modules installed from npm
const btoa = require('btoa');
// application modules
require('dotenv').config();
const logger = require('./logger');

// EnableX server REST API call options
// const httpOptions = {
//   host: 'api.enablex.io',
//   port: 443,
//   headers: {
//     Authorization: `Basic ${btoa(`${process.env.ENABLEX_APP_ID}:${process.env.ENABLEX_APP_KEY}`)}`,
//     'Content-Type': 'application/json',
//   },
// };

// // Function: To initiate Rest API Call to Server API
// // eslint-disable-next-line no-shadow
// const connectEnablexServer = (data, callback) => {
//   logger.info(httpOptions);
//   logger.info(`REQ URI:- ${httpOptions.method} ${httpOptions.host}:${httpOptions.port}${httpOptions.path}`);
//   logger.info(`REQ PARAM:- ${data}`);

//   const req = request(httpOptions, (res) => {
//     res.on('data', (chunk) => {
//       logger.info(`RESPONSE DATA:- ${chunk}`);
//       callback(JSON.parse(chunk));
//     });
//   });

//   req.on('error', (err) => {
//     logger.info(`RESPONSE ERROR:- ${JSON.stringify(err)}`);
//   });

//   if (data == null) {
//     req.end();
//   } else {
//     req.end(data);
//   }
// };

/* Function to make REST API Calls */
function makeVoiceAPICall(path, data, callback) {
  const httpOptions = {
    host: 'api.enablex.io',
    port: 443,
    path,
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${process.env.ENABLEX_APP_ID}:${process.env.ENABLEX_APP_KEY}`)}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };
  const req = request(httpOptions, (res) => {
    let body = '';
    res.on('data', (response) => {
      body += response;
    });

    res.on('end', () => {
      callback(body);
    });

    res.on('error', (e) => {
      logger.info(`Got error: ${e.message}`);
    });
  });

  req.write(data);
  req.end();
}

/* Function to Create Call */
function createCall(eventUrl, callback) {
  const postData = JSON.stringify({
    name: 'TEST_APP',
    owner_ref: 'XYZ',
    to: process.env.TO_NUMBER,
    from: process.env.ENABLEX_OUTBOUND_NUMBER,
    action_on_connect: {
      play: {
        text: process.env.TTS_PLAY_TEXT,
        voice: process.env.TTS_PLAY_VOICE,
        language: 'en-US',
        prompt_ref: '1',
      },
    },
    event_url: eventUrl,
  });

  logger.info(postData);

  makeVoiceAPICall('/voice/v1/calls', postData, (response) => {
    callback(response);
  });
}

/* Function to Hangup Call */
function hangupCall(path, callback) {
  const httpOptions = {
    host: 'api.enablex.io',
    port: 443,
    path,
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${btoa(`${process.env.ENABLEX_APP_ID}:${process.env.ENABLEX_APP_KEY}`)}`,
      'Content-Type': 'application/json',
    },
  };
  const req = request(httpOptions, (res) => {
    let body = '';
    res.on('data', (data) => {
      body += data;
    });

    res.on('end', () => {
      callback(body);
    });

    res.on('error', (e) => {
      logger.info(`Got error: ${e.message}`);
    });
  });

  req.end();
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      logger.error(`Port ${process.env.SERVICE_PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`Port ${process.env.SERVICE_PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

module.exports = {
  makeVoiceAPICall,
  createCall,
  hangupCall,
  onError,
};
