const pool = require('./../config/db.js')
const userRepoFactory = require('./../repositories/user.repository.js')
const bcrypt = require('bcryptjs')
const userRepo = userRepoFactory(pool)
const pinoLogger = require('./../config/logger.js')
const { getLogger } = require('pino-correlation-id')

/*
    Create admin user in DB if doesn't exist
*/
const createAdminUser = async () => {
    const log = getLogger(pinoLogger)
    try {
        const user = await userRepo.adminExist()
        
        if (!user) {
            if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PWD) {
                log.error("Create admin failed. ADMIN_EMAIL or ADMIN_PWD is missing")
                process.exit(1)
            } else {
                const adminMail = process.env.ADMIN_EMAIL
                const adminPwd = await bcrypt.hash(process.env.ADMIN_PWD, 10)
                const user = {
                    lastname: 'admin',
                    firstname: 'admin',
                    email: adminMail,
                    password: adminPwd,
                    email_verified_at: new Date(),
                    role: 'admin'
                }
    
                await userRepo.createUser(user)
                log.info('Admin user created')
            }
        } 

    } catch (err) { 
        if (err.constraint == 'uq_user_email') {
            log.info('Admin account already exist ')
        } 
    }

}

module.exports = createAdminUser
