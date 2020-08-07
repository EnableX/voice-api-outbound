// core modules
const https = require('https');
const { readFileSync } = require('fs');
// modules installed from npm
const events = require('events');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const ngrok = require('ngrok');
require('dotenv').config();
const _ = require('lodash');
// application modules
const logger = require('./logger');
const {
  makeVoiceAPICall, createCall, hangupCall, onError,
} = require('./voiceapi');

// Express app setup
const app = express();

const eventEmitter = new events.EventEmitter();

let server;
let webHookUrl;
let callVoiceId;
const consoleLog = [];

function timeOutHandler() {
  logger.info(`[${callVoiceId}] Disconnecting the call`);
  hangupCall(`/voice/v1/calls/${callVoiceId}`, () => { });
}

function shutdown() {
  server.close(() => {
    logger.info('Shutting down the server');
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(1);
  }, 10000);
}

function onListening() {
  logger.info(`Listening on Port ${process.env.SERVICE_PORT}`);
  webHookUrl = `${process.env.PUBLIC_WEBHOOK_HOST}/event`;
}

function createNgrokTunnel() {
  server = app.listen(process.env.SERVICE_PORT, () => {
    console.log(`Server running on port ${process.env.SERVICE_PORT}`);
    (async () => {
      try {
        webHookUrl = await ngrok.connect({ proto: 'http', addr: process.env.SERVICE_PORT });
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

function createAppServer() {
  const options = {
    key: readFileSync(process.env.CERTIFICATE_SSL_KEY).toString(),
    cert: readFileSync(process.env.CERTIFICATE_SSL_CERT).toString(),
  };
  if (process.env.CERTIFICATE_SSL_CACERTS) {
    options.ca = [];
    options.ca.push(readFileSync(process.env.CERTIFICATE_SSL_CACERTS).toString());
  }

  server = https.createServer(options, app);
  app.set('port', process.env.SERVICE_PORT);
  server.listen(process.env.SERVICE_PORT);

  server.on('error', onError);
  server.on('listening', onListening);
}

/* Initializing WebServer */
if (process.env.USE_NGROK_TUNNEL === 'true' && process.env.USE_PUBLIC_WEBHOOK === 'false') {
  createNgrokTunnel();
} else if (process.env.USE_PUBLIC_WEBHOOK === 'true' && process.env.USE_NGROK_TUNNEL === 'false') {
  createAppServer();
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

app.post('/create-call', (req, res) => {
  /* Initiating Outbound Call */
  process.env.ENABLEX_OUTBOUND_NUMBER = req.body.from;
  process.env.TO_NUMBER = req.body.to;
  process.env.TTS_PLAY_TEXT = req.body.play_text;
  process.env.TTS_PLAY_VOICE = req.body.play_voice;
  logger.info(`Initiating a call from ${process.env.ENABLEX_OUTBOUND_NUMBER} to ${process.env.TO_NUMBER}`);
  consoleLog.push(`Initiating a call from ${process.env.ENABLEX_OUTBOUND_NUMBER} to ${process.env.TO_NUMBER}`);
  createCall(webHookUrl, (response) => {
    const msg = JSON.parse(response);
    callVoiceId = msg.voice_id;
    logger.info(`Voice Id of the Call ${callVoiceId}`);
  });
  res.send('ok');
  res.status(200);
});

function constructSSE(res, id, data) {
  res.write(`id: ${id}\n`);
  res.write(`data: ${data}\n\n`);
}

function sendSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const id = (new Date()).toLocaleTimeString();

  setInterval(() => {
    if (!_.isEmpty(consoleLog[0])) {
      const data = `${consoleLog[0]}`;
      constructSSE(res, id, data);
      consoleLog.pop();
    }
  }, 100);
}

app.get('/event-stream', (req, res) => {
  sendSSE(req, res);
});

app.post('/event', (req, res) => {
  const key = crypto.createDecipher(req.headers['x-algoritm'], process.env.ENABLEX_APP_ID);
  let decryptedData = key.update(req.body.encrypted_data, req.headers['x-format'], req.headers['x-encoding']);
  decryptedData += key.final(req.headers['x-encoding']);
  const jsonObj = JSON.parse(decryptedData);
  logger.info(JSON.stringify(jsonObj));

  res.statusCode = 200;
  res.send();
  res.end();
  eventEmitter.emit('voicestateevent', jsonObj);
});

/* WebHook Event Handler function */
function voiceEventHandler(voiceEvent) {
  if (voiceEvent.state) {
    if (voiceEvent.state === 'connected') {
      logger.info(`[${callVoiceId}] Outbound Call is connected`);
      consoleLog.push('Outbound Call is connected');
    } else if (voiceEvent.state === 'disconnected') {
      logger.info(`[${callVoiceId}] Outbound Call is disconnected`);
      consoleLog.push('Outbound Call is disconnected');
      // shutdown();
    }
  } else if (voiceEvent.playstate !== undefined) {
    if (voiceEvent.playstate === 'playfinished') {
      if (voiceEvent.prompt_ref === '1') {
        logger.info(`[${callVoiceId}] Greeting is completed, Playing IVR Menu`);
        consoleLog.push('Greeting is completed, Playing IVR Menu');
        /* Playing IVR menu using TTS */
        const playCommand = JSON.stringify({
          play: {
            text: 'This is the 1st level menu, Hanging up the call in 10 Sec',
            voice: process.env.TTS_PLAY_VOICE,
            language: 'en-US',
            prompt_ref: '2',
          },
        });
        makeVoiceAPICall(`/voice/v1/calls/${callVoiceId}`, playCommand, () => {});
      } else if (voiceEvent.prompt_ref === '2') {
        logger.info(`[${callVoiceId}] 1st Level IVR menu is Completed, Disconnecting the call in 10 Sec`);
        consoleLog.push('1st Level IVR menu is Completed, Disconnecting the call in 10 Sec');
        setTimeout(timeOutHandler, 10000);
      }
    }
  }
}

/* Registering WebHook Event Handler function */
eventEmitter.on('voicestateevent', voiceEventHandler);
