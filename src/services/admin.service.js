const {getLogger} = require('pino-correlation-id')
const pinoLogger = require('./../config/logger.js')

const adminService = (loginHistoryRepo, refreshTokenRepo, userRepo) => {
    return {
        async listSessions() {
            const log = getLogger(pinoLogger)
            const sessions = await refreshTokenRepo.getActiveSession()
            log.debug({sessions : sessions.length}, 'retrieved')
            return sessions
        },

        async getLoginHistory() {
            const log = getLogger(pinoLogger)
            const histories = loginHistoryRepo.getLoginHistory()
            log.debug({histories : histories.length}, 'retrieved')
            return histories
        },

        async disableAccount(id) {
            const log = getLogger(pinoLogger)
            const result = await userRepo.disableAccount(id)
            log.debug({id}, 'account disabled')

            return true
        }
    }
}

module.exports = adminService