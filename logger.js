// Import modules
const { createLogger, format, transports } = require('winston');

const {
  combine, timestamp, label, printf,
} = format;

const customFormat = printf(({
  // eslint-disable-next-line no-shadow
  level, message, label, timestamp,
}) => `[${level}] [${timestamp}-${label}] ${message}`);

// Logger configuration
const logConfiguration = {
  format: combine(
    label({ label: 'app log!' }),
    timestamp(),
    customFormat,
  ),
  transports: [
    new transports.Console({
      level: 'info',
    }),
    new transports.File({
      level: 'error',
      filename: './logs/app.log',
    }),
  ],
  exitOnError: false,
};

// Create the logger
const logger = createLogger(logConfiguration);

// Export the logger
module.exports = logger;
