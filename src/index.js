require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const rateLimiter = require('express-rate-limit')
const logger = require('./config/logger.js')
const pool = require('./config/db.js')

const { createPublicsFolder } = require('./config/bootstrap.js')
const createAdmin = require('./utils/dbSeedHelpers.js')
const checkConnDB = require('./utils/checkDB.js')
const { getUploadDirPath } = require('./utils/pathHelpers.js')
const globalErrorMiddleware = require('./middlewares/globalError.middleware.js')
const authRouter = require('./routes/auth.route.js')
const userRouter = require('./routes/user.route.js')
const adminRouter = require('./routes/admin.route.js')
const blacklistedTokenRepoFactory = require('./repositories/blacklistedToken.repository.js')
const authCheckerMiddlewareFactory = require('./middlewares/authChecker.middleware.js')
const roleCheckerMiddleware = require('./middlewares/roleCheckerMiddleware.js')

const blacklistedRepo = blacklistedTokenRepoFactory(pool)
const authCheckerMiddleware = authCheckerMiddlewareFactory(blacklistedRepo)
 
const { expressMiddleware, getLogger } = require('pino-correlation-id')
const log = getLogger(logger)

// Implement Rate limiting (50req / 15min)

const limit = rateLimiter({
    windowMs : 15 * 60 * 1000, // 15 min,
    legacyHeaders: false,
    limit : 50,
    message : {success:false, errors:["We have received too many requests from your IP"]}
})

const app = express();

app.use(expressMiddleware({ logger }))
app.use(limit)
app.use(cookieParser())
app.use(express.json())
// Serve static file from $(getUploadDirPath()) under /profil prefix
app.use('/profil', express.static(getUploadDirPath()))

app.use('/auth', authRouter)
app.use('/users', authCheckerMiddleware, userRouter)
app.use('/admin', authCheckerMiddleware, roleCheckerMiddleware, adminRouter)

app.get('/health', (req, res) => res.send("Server is up..."))

app.all('{/*any}', (req, res) => {
    return res.status(404).json({success:false, errors : "URL NOT FOUND"})
})

app.use(globalErrorMiddleware)
 
const PORT  = process.env.PORT || 3000

const startServer = async () => {
    await createPublicsFolder()
    await createAdmin()
    await checkConnDB() 
    app.listen(PORT, () => {
        log.info('Server starts....')
    });
}

startServer()