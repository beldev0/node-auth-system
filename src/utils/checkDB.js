const { Client } = require('pg')
const logger = require('./../config/logger.js')

/* Check if node server can connect to DB before spin it up  */
const checkDBConn = async () => {
    if (!process.env.DATABASE_URL) {
        logger.error('DATABASE URL not found')
        process.exit(1) 
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL
    })

    try {
        await client.connect()
        logger.info("Successfully connect to DB")
    } catch (err) {
        log.error({err})
    } finally {
        await client.end()
    }
}

module.exports = checkDBConn

