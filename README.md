# **Basic Client Examples to demonstrate Outbound Calls using Enablex Voice APIs. **
This example contains instructions how users can initiate Outbound Calls.

## Prerequisite
- You will need Enablex Application credentials, APP ID and APP KEY.
- You will need a place for hosting this application either cloud or local machine.
- If hosting on local machine, you need to install ngrok from https://ngrok.com/


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

- WEBHOOK - EnableX will send HTTP (or HTTPS) requests to your application after certain events occur
  - It is an optional configuration.
  - Set this to `true` if you have deployed this service on a web server which is publicly accessible
  - Else set to `false`
    - `export USE_PUBLIC_WEBHOOK=`

- WEBHOOK - Set this if USE_PUBLIC_WEBHOOK set to `true`. Else leave it empty
  - Set to web server address where this service is deployed and publicly accessible
    - `export PUBLIC_WEBHOOK_HOST=`

- Tunneling - Either WEBHOOK or NGROK should be set to `true`
  - Set this to `true` if you want to deploy this service on a web server running locally on your own computer at a given port.
  - Else set to `false`
  - With ngrok, you can generate HTTP / HTTPS URL (such as https://fc6c892d6cd7.ngrok.io)
  - that tunnels requests to web server running locally on your own computer at a given port
  - ngrok (https://ngrok.com/) should be installed on your computer
    - `USE_NGROK_TUNNEL=`

- SSL Certificate (Self Signed or Registered). It is required configuration if USE_PUBLIC_WEBHOOK is set to true.
  - Make a directory called certs on the root of the project - `mkdir certs`
  - Change to certs directory - `cd certs`
  - Create and Install certificates
    - `openssl req -nodes -new -x509   -keyout example.key -out example.crt   -days 365   -subj '/CN=example.com/O=My Company Name LTD./C=US'; cat example.crt > example.ca-bundle`
  - use the certificate .key [self signed or registered]
    - `export CERTIFICATE_SSL_KEY=`
  - use the certificate .crt [self signed or registered]
    - `export CERTIFICATE_SSL_CERT=`
  - use the certificate CA[chain] [self signed or registered]
    - `export CERTIFICATE_SSL_CACERTS=`
  - switch to the root of the project
    - `cd ..`

## Webhook security
- Webhook security is also implemented as part of the voice service APIs.
- Enablex Voice Server does encryption of Webhook payload using 'md5' encryption and app_id as key.
- Client needs to do decryption of payload using app_id provided by Enablex and algorithm, format, encoding parameters present in x-algoritm, x-format and x-encoding header.
- Please refer to the documentation and examples for proper way of handling Webhook payloads.

## Starting the client application script
- For Outbound Calls,
  - `node client-outbound.js`
