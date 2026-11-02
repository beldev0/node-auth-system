const paths = require('./../utils/pathHelpers.js')
const fsp = require('fs/promises')
const pinoLogger = require('./../config/logger.js')
const {getLogger} = require('pino-correlation-id')

async function createPublicsFolder() {
    const log = getLogger(pinoLogger)

    const PUBLIC_DIR = paths.getPublicDirPath()
    const UPLOAD_DIR = paths.getUploadDirPath()

    await fsp.mkdir(PUBLIC_DIR, { recursive: true })
    log.info('PUBLIC DIR created....')
    
    await fsp.mkdir(UPLOAD_DIR, { recursive: true })
    log.info('UPLOAD DIR created....')
}

module.exports = { createPublicsFolder }