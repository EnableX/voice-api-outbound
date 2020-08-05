const config = {};

config.app_name = 'TEST_APP';
config.enablex_number = '3197010240003';
config.to_number = '919910056363';
config.voice_server_host = 'api.enablex.io';
config.voice_server_port = 443;
config.path = '/voice/v1/calls';
config.app_id = '5f1e99bf90ef8078052e6462';
config.app_key = 'Ry3uEurydeSyTuReXaDuMe9u7ysasamutaby';
config.webhook_port = 3000;
config.ngrok = true; // If false, user needs to provide ssl certs
config.webhook_host = 'webhook.example.io'; // Needs to provide if ngrok = false
config.certificate = {
  ssl_key: '/certs/example.key', // Path to .key file
  ssl_cert: '/certs/example.crt', // Path to .crt file
  ssl_ca_certs: '/certs/example.ca-bundle', // Path to CA[chain]
};

module.exports = config;
