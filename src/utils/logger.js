import { createLogger, format, transports } from "winston";

// Create logger instance
const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new transports.Console(), // Logs to console
    new transports.File({ filename: "logs/app.log" }) // Logs to a file
  ],
});

export default logger; // Use ES Module export
