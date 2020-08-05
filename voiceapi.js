// core modules
const https = require('https');
// modules installed from npm
const btoa = require('btoa');
// application modules
const config = require('./config-outbound');
const logger = require('./logger');

/* Function to make REST API Calls */
function makeVoiceAPICall(path, data, callback) {
  const httpOptions = {
    host: config.voice_server_host,
    port: config.voice_server_port,
    path,
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${config.app_id}:${config.app_key}`)}`,
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
    host: config.voice_server_host,
    port: config.voice_server_port,
    path,
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${btoa(`${config.app_id}:${config.app_key}`)}`,
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
      logger.error(`Port ${config.webhook_port} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`Port ${config.webhook_port} is already in use`);
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
