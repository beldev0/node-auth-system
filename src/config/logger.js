const pino = require('pino')
const isProduction = process.env.NODE_ENV === 'production'

const loggerConfig = pino({
    level: isProduction ? 'info' : 'debug',

    base: {
        env: process.env.NODE_ENV || 'development', 
        service: 'node-app'
    },

    redact: {
        paths: [
            'password',
            'confirm_password',
            'accessToken',
            'refreshToken', 
            '*.password',
            '*.confirm_password',
            '*.refreshToken',
            'token',
            '*.token',
            '*.accessToken',
            'data.accessToken',
            'req.headers.cookie',
            'req.headers.authorization',
            '*.data.accessToken',
            '*.data.refreshToken',
            
        ],
        censor: '[RESTRICTED]'
    },

    timestamp: pino.stdTimeFunctions.isoTime,

    ...(isProduction
        ? {}
        : {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname,env'
                }
            }
        }
    )
})

module.exports = loggerConfig