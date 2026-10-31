const jwt = require('jsonwebtoken')
const { getLogger } = require('pino-correlation-id')
const pinoLogger = require('./../config/logger.js')

const roleCheckerMiddleware = (req, res, next) => {
    const log = getLogger(pinoLogger)
    log.debug({user : req.user})
    if (req.user.role == 'admin') {
        next()
    } else {
        log.warn('Acccess deny')
        next({statusCode : 403, "name":'Custom Error', errors:["You have required priviledge"]})
    }
}

module.exports = roleCheckerMiddleware