import winston from 'winston'

export const logger = winston.createLogger({
  level: 'info', // can be 'error', 'warn', 'info', 'debug'
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
})

