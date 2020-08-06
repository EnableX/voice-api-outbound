// core modules
const https = require('https');
// modules installed from npm
const btoa = require('btoa');
// application modules
require('dotenv').config();
const logger = require('./logger');

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
  const req = https.request(httpOptions, (res) => {
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
  const req = https.request(httpOptions, (res) => {
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
  hangupCall,
  onError,
};
