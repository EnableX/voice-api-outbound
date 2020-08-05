# **Basic Client Examples to demonstrate Outbound Calls using Enablex Voice APIs. **
This example contains instructions how users can initiate Outbound Calls.

## Prerequisite
- You will need Enablex Application credentials, app_id and app_key.
- You will need to configure the phone number you purchased from Enablex.
- You will need a place for hosting this application either cloud or local machine.
- If hosting on local machine, you need to install ngrok from https://ngrok.com/


## Installation
- git clone {repo_url}
- cd {git_directory}
- npm install

## Setting up configurations.
- Set app_id and app_key & other parameters in config file.
- For Outbound call client, Open `config-outbound.js` and set Enablex Application credentials, app_id and app_key
  - config.app_id
  - config.app_key

## Webhook security
- Webhook security is also implemented as part of the voice service APIs.
- Enablex Voice Server does encryption of Webhook payload using 'md5' encryption and app_id as key.
- Client needs to do decryption of payload using app_id provided by Enablex and algorithm, format, encoding parameters present in x-algoritm, x-format and x-encoding header.
- Please refer to the documentation and examples for proper way of handling Webhook payloads.

## Starting the client application script
- For Outbound Calls, cd outbound
  - node client-outbound.js
