const config = {};

config.app_name = 'TEST_APP';
config.owner_ref = 'XYZ';
config.enablex_number = '';
config.to_number = '';
config.play_text = '';
config.play_voice = '';
config.voice_server_host = 'api.enablex.io';
config.voice_server_port = 443;
config.path = '/voice/v1/calls';
config.app_id = '';
config.app_key = '';
config.webhook_port = 3000;
config.ngrok = true; // If false, user needs to provide ssl certs
config.webhook_host = 'webhook.example.io'; // Needs to provide if ngrok = false
config.certificate = {
  ssl_key: '/certs/example.key', // Path to .key file
  ssl_cert: '/certs/example.crt', // Path to .crt file
  ssl_ca_certs: '/certs/example.ca-bundle', // Path to CA[chain]
};

module.exports = config;
