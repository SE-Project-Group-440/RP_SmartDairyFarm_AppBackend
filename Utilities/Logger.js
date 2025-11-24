import pino from "pino"

const Logger = pino({
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime:'SYS:HH:MM:ss',
        ignore:'pid,hostname'
      }
    },
  })

  export {Logger}