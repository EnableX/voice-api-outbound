// core modules
const { createServer } = require('https');
const { readFileSync } = require('fs');
// modules installed from npm
const { EventEmitter } = require('events');
const express = require('express');
const bodyParser = require('body-parser');
const { createDecipher } = require('crypto');
const { connect } = require('ngrok');
require('dotenv').config();
const _ = require('lodash');
// application modules
const logger = require('./logger');
const {
  ivrVoiceCall, makeOutboundCall, hangupCall,
} = require('./voiceapi');

// Express app setup
const app = express();

const eventEmitter = new EventEmitter();

let server;
let webHookUrl;
let callVoiceId;
let ttsPlayVoice = 'female';
const sseMsg = [];

// shutdown the node server forcefully
function shutdown() {
  server.close(() => {
    logger.info('Shutting down the server');
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(1);
  }, 10000);
}

// exposes web server running on local machine to the internet
// @param - web server port
// @return - public URL of your tunnel
function createNgrokTunnel(serverPort) {
  server = app.listen(serverPort, () => {
    console.log(`Server running on port ${serverPort}`);
    (async () => {
      try {
        webHookUrl = await connect({ proto: 'http', addr: serverPort });
        console.log('ngrok tunnel set up:', webHookUrl);
      } catch (error) {
        console.log(`Error happened while trying to connect via ngrok ${JSON.stringify(error)}`);
        shutdown();
        return;
      }
      webHookUrl += '/event';
    })();
  });
}

// Set webhook event url
function setWebHookEventUrl() {
  logger.info(`Listening on Port ${process.env.SERVICE_PORT}`);
  webHookUrl = `${process.env.PUBLIC_WEBHOOK_HOST}/event`;
}

// Handle error generated while creating / starting an http server
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

// create and start an HTTPS node app server
// An SSL Certificate (Self Signed or Registered) is required
function createAppServer(serverPort) {
  const options = {
    key: readFileSync(process.env.CERTIFICATE_SSL_KEY).toString(),
    cert: readFileSync(process.env.CERTIFICATE_SSL_CERT).toString(),
  };
  if (process.env.CERTIFICATE_SSL_CACERTS) {
    options.ca = [];
    options.ca.push(readFileSync(process.env.CERTIFICATE_SSL_CACERTS).toString());
  }

  // Create https express server
  server = createServer(options, app);
  app.set('port', serverPort);
  server.listen(serverPort);
  server.on('error', onError);
  server.on('listening', setWebHookEventUrl);
}

/* Initializing WebServer */
const servicePort = process.env.SERVICE_PORT || 3000;
if (process.env.USE_NGROK_TUNNEL === 'true' && process.env.USE_PUBLIC_WEBHOOK === 'false') {
  createNgrokTunnel(servicePort);
} else if (process.env.USE_PUBLIC_WEBHOOK === 'true' && process.env.USE_NGROK_TUNNEL === 'false') {
  createAppServer(servicePort);
} else {
  logger.error('Incorrect configuration - either USE_NGROK_TUNNEL or USE_PUBLIC_WEBHOOK should be set to true');
}

process.on('SIGINT', () => {
  logger.info('Caught interrupt signal');
  shutdown();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('client'));

// outbound voice call
// req contains fromNumber, toNumber, TTS text, & voice (gender)
app.post('/outbound-call', (req, res) => {
  logger.info(`Initiating a call from ${req.body.from} to ${req.body.to}`);
  // set msg to be used for SSE events to display on webpage
  sseMsg.push(`Initiating a call from ${req.body.from} to ${req.body.to}`);
  // voice (gender) received from request will also be used in webhook
  ttsPlayVoice = req.body.play_voice;
  /* Initiating Outbound Call */
  makeOutboundCall(req.body, webHookUrl, (response) => {
    const msg = JSON.parse(response);
    // set voice_id to be used throughout
    callVoiceId = msg.voice_id;
    logger.info(`Voice Id of the Call ${callVoiceId}`);
    res.send(msg);
    res.status(200);
  });
});

// It will send stream / events all the events received from webhook to the client
app.get('/event-stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const id = (new Date()).toLocaleTimeString();

  setInterval(() => {
    if (!_.isEmpty(sseMsg[0])) {
      const data = `${sseMsg[0]}`;
      res.write(`id: ${id}\n`);
      res.write(`data: ${data}\n\n`);
      sseMsg.pop();
    }
  }, 100);
});

// Webhook event which will be called by EnableX server once an outbound call is made
// It should be publicly accessible. Please refer document for webhook security.
app.post('/event', (req, res) => {
  const key = createDecipher(req.headers['x-algoritm'], process.env.ENABLEX_APP_ID);
  let decryptedData = key.update(req.body.encrypted_data, req.headers['x-format'], req.headers['x-encoding']);
  decryptedData += key.final(req.headers['x-encoding']);
  const jsonObj = JSON.parse(decryptedData);
  logger.info(JSON.stringify(jsonObj));

  res.send();
  res.status(200);
  eventEmitter.emit('voicestateevent', jsonObj);
});

// Call is completed / disconneted, inform server to hangup the call
function timeOutHandler() {
  logger.info(`[${callVoiceId}] Disconnecting the call`);
  hangupCall(callVoiceId, () => { });
}

/* WebHook Event Handler function */
function voiceEventHandler(voiceEvent) {
  if (voiceEvent.state) {
    if (voiceEvent.state === 'connected') {
      const eventMsg = 'Outbound Call is connected';
      logger.info(`[${callVoiceId}] ${eventMsg}`);
      sseMsg.push(eventMsg);
    } else if (voiceEvent.state === 'disconnected') {
      const eventMsg = 'Outbound Call is disconnected';
      logger.info(`[${callVoiceId}] ${eventMsg}`);
      sseMsg.push(eventMsg);
    }
  }

  if (voiceEvent.playstate !== undefined) {
    if (voiceEvent.playstate === 'playfinished') {
      if (voiceEvent.prompt_ref === '1') {
        const eventMsg = 'Greeting is completed, Playing IVR Menu';
        logger.info(`[${callVoiceId}] ${eventMsg}`);
        sseMsg.push(eventMsg);
        /* Playing IVR menu using TTS */
        ivrVoiceCall(callVoiceId, ttsPlayVoice, () => {});
      } else if (voiceEvent.prompt_ref === '2') {
        const eventMsg = '1st Level IVR menu is Completed, Disconnecting the call in 10 Sec';
        logger.info(`[${callVoiceId}] ${eventMsg}`);
        sseMsg.push(eventMsg);
        setTimeout(timeOutHandler, 10000);
      }
    }
  }
}

/* Registering WebHook Event Handler function */
eventEmitter.on('voicestateevent', voiceEventHandler);
