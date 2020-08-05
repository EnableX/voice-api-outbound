// core modules
const { readFileSync } = require('fs');
const https = require('https');

// modules installed from npm
const events = require('events');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const ngrok = require('ngrok');
const _ = require('lodash');

// application modules
const config = require('./config-outbound');
const logger = require('./logger');
const {
  makeVoiceAPICall, hangupCall, onError,
} = require('./voiceapi');

// Express app setup
const app = express();

const eventEmitter = new events.EventEmitter();

let server;
let url = '';
/* Object to maintain Call Details */
const call = {};
call.voice_id = '';
const consoleLog = [];

/* Function to Create Call */
function createCall(eventUrl, callback) {
  logger.info(`Initiating a call from ${config.enablex_number} to ${config.to_number}`);
  consoleLog.push(`Initiating a call from ${config.enablex_number} to ${config.to_number}`);
  const postData = JSON.stringify({
    name: config.app_name,
    owner_ref: config.owner_ref,
    to: config.to_number,
    from: config.enablex_number,
    action_on_connect: {
      play: {
        text: config.play_text,
        voice: config.play_voice,
        language: 'en-US',
        prompt_ref: '1',
      },
    },
    event_url: eventUrl,
  });

  logger.info(postData);

  makeVoiceAPICall(config.path, postData, (response) => {
    callback(response);
  });
}

function timeOutHandler() {
  logger.info(`[${call.voice_id}] Disconnecting the call`);
  hangupCall(`${config.path}/${call.voice_id}`, () => { });
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
  logger.info(`Listening on Port ${config.webhook_port}`);
  const eventUrl = `https://${config.webhook_host}:${config.webhook_port}/event`;
  // Initiating Outbound Call
  createCall(eventUrl, (response) => {
    const msg = JSON.parse(response);
    call.voice_id = msg.voice_id;
    logger.info(`Voice Id of the Call ${call.voice_id}`);
  });
}

/* Initializing WebServer */
if (config.ngrok === true) {
  server = app.listen(config.webhook_port, () => {
    logger.info(`Server running on port ${config.webhook_port}`);
    (async () => {
      try {
        url = await ngrok.connect({ proto: 'http', addr: config.webhook_port });
        logger.info('ngrok tunnel set up:', url);
      } catch (error) {
        logger.info(`Error happened while trying to connect via ngrok ${JSON.stringify(error)}`);
        shutdown();
        return;
      }
      url += '/event';
    })();
  });
} else if (config.ngrok === false) {
  const options = {
    key: readFileSync(config.certificate.ssl_key).toString(),
    cert: readFileSync(config.certificate.ssl_cert).toString(),
  };
  if (config.certificate.ssl_ca_certs) {
    options.ca = [];
    options.ca.push(readFileSync(config.certificate.ssl_ca_certs).toString());
  }

  server = https.createServer(options, app);
  app.set('port', config.webhook_port);
  server.listen(config.webhook_port);

  server.on('error', onError);
  server.on('listening', onListening);
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
  config.enablex_number = req.body.from;
  config.to_number = req.body.to;
  config.play_text = req.body.play_text;
  config.play_voice = req.body.play_voice;
  createCall(url, (response) => {
    const msg = JSON.parse(response);
    call.voice_id = msg.voice_id;
    logger.info(`Voice Id of the Call ${call.voice_id}`);
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
  const key = crypto.createDecipher(req.headers['x-algoritm'], config.app_id);
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
  if (voiceEvent.state && voiceEvent.state === 'connected') {
    logger.info(`[${call.voice_id}] Outbound Call is connected`);
    consoleLog.push('Outbound Call is connected');
  } else if (voiceEvent.state && voiceEvent.state === 'disconnected') {
    logger.info(`[${call.voice_id}] Outbound Call is disconnected`);
    consoleLog.push('Outbound Call is disconnected');
    // shutdown();
  } else if (voiceEvent.playstate !== undefined) {
    if (voiceEvent.playstate === 'playfinished' && voiceEvent.prompt_ref === '1') {
      logger.info(`[${call.voice_id}] Greeting is completed, Playing IVR Menu`);
      consoleLog.push('Greeting is completed, Playing IVR Menu');
      /* Playing IVR menu using TTS */
      const playCommand = JSON.stringify({
        play: {
          text: 'This is the 1st level menu, Hanging up the call in 10 Sec',
          voice: config.play_voice,
          language: 'en-US',
          prompt_ref: '2',
        },
      });
      makeVoiceAPICall(`${config.path}/${call.voice_id}`, playCommand, () => {});
    }
    if (voiceEvent.playstate === 'playfinished' && voiceEvent.prompt_ref === '2') {
      logger.info(`[${call.voice_id}] 1st Level IVR menu is Completed, Disconnecting the call in 10 Sec`);
      consoleLog.push('1st Level IVR menu is Completed, Disconnecting the call in 10 Sec');
      setTimeout(timeOutHandler, 10000);
    }
  }
}

/* Registering WebHook Event Handler function */
eventEmitter.on('voicestateevent', voiceEventHandler);
