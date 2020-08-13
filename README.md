# **Basic Client Examples to demonstrate Outbound Calls using Enablex Voice APIs. **
This example contains instructions how users can initiate Outbound Calls.

## Prerequisite
- You will need Enablex Application credentials, APP ID and APP KEY.
- You will need a place for hosting this application either cloud or local machine.


## Installation
- `git clone https://github.com/EnableX/voice-api-outbound.git`
- `cd voice-api-outbound`
- `npm install`

## Setting up configurations using environment variables
- Set APP ID and APP KEY. It is required configuration.
  - `export ENABLEX_APP_ID=`
  - `export ENABLEX_APP_KEY=`

- Set port. Default port is set to 3000. It is an optional configuration.
  - `export SERVICE_PORT=`

## Webhook - EnableX will send HTTP requests to your application (`/event`) after certain events occur.
  - You need to set the publicly accessible URL of your application at https://portal.enablex.io/projects/dashboard/voice/prompt-settings/
    - If you have deployed this service on a web server which is publicly accessible
      - Set the URL by appending `/event`. Example - `https://{URL}/event`
    - If you want to test this service on a web server running locally on your own computer at a given port, with ngrok, you can generate URL that tunnels requests to your web server running locally. Once ngrok installed, run following -
      - `./ngrok http {SERVICE_PORT}` . It should provide you a ngrok URL something similar to `https://fc6c892d6cd7.ngrok.io`
        - Set the URL by appending `/event`. Example - `https://fc6c892d6cd7.ngrok.io/event`

## Webhook security
- Webhook security is also implemented as part of the voice service APIs.
- Enablex Voice Server does encryption of Webhook payload using 'md5' encryption and app_id as key.
- Client needs to do decryption of payload using app_id provided by Enablex and algorithm, format, encoding parameters present in x-algoritm, x-format and x-encoding header.
- Please refer to the documentation and examples for proper way of handling Webhook payloads.

## Starting the client application script
- For Outbound Calls,
  - `node client-outbound.js`
