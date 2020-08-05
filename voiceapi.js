// core modules
const https = require('https');
// modules installed from npm
const btoa = require('btoa');
// application modules
const config = require('./config-outbound');
const logger = require('./logger');

// Function: To connect to Enablex Server API Service
function connectServer(options, data, callback) {
  logger.info(`REQ URI:- ${options.method} ${options.host}:${options.port}${options.path}`);
  logger.info(`REQ PARAM:- ${data}`);
  const request = https.request(options, (res) => {
    res.on('data', (chunk) => {
      logger.info(`RESPONSE DATA:- ${chunk}`);
      if (chunk.result === 0) {
        callback('success', JSON.parse(chunk));
      } else {
        callback('error', JSON.parse(chunk));
      }
    });
  });
  request.on('error', (err) => {
    logger.info(`RESPONSE ERROR:- ${JSON.stringify(err)}`);
  });
  if (data == null) {
    request.end();
  } else {
    request.end(data);
  }
}

// Function: To get Token for a Room
function outboundCall(details, callback) {
  const options = {
    host: config.voice_server_host,
    port: config.voice_server_port,
    path: config.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${config.app_id}:${config.app_key}`)}`,
    },
  };

  connectServer(options, JSON.stringify(details), (status, data) => {
    if (status === 'success') {
      callback(status, data);
    } else if (status === 'error') {
      callback(status, data);
    }
  });
}

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
  outboundCall,
  connectServer,
  makeVoiceAPICall,
  hangupCall,
  onError,
};
