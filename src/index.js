require('dotenv').config()
const express = require('express')
const cookieParser = require('cookie-parser')
const pool = require('./config/db.js')

const { createPublicsFolder } = require('./config/bootstrap.js')
const { getUploadDirPath } = require('./utils/pathHelpers.js')
const globalErrorMiddleware = require('./middlewares/globalError.middleware.js')
const authRouter = require('./routes/auth.route.js')
const userRouter = require('./routes/user.route.js')
const blacklistedTokenRepoFactory = require('./repositories/blacklistedToken.repository.js')
const authCheckerMiddlewareFactory = require('./middlewares/authChecker.middleware.js')

const blacklistedRepo = blacklistedTokenRepoFactory(pool)
const authCheckerMiddleware = authCheckerMiddlewareFactory(blacklistedRepo)


const app = express();

app.use(cookieParser())
app.use(express.json())

app.use('/profil', express.static(getUploadDirPath()))
app.use('/auth', authRouter)
app.use('/users', authCheckerMiddleware, userRouter)

app.get('/health', (req, res) => res.send("Server is up..."))

app.all('{/*any}', (req, res) => {
    return res.status(404).json({success:false, errors : "URL NOT FOUND"})
})

app.use(globalErrorMiddleware)

createPublicsFolder()

const PORT  = process.env.PORT || 3000
app.listen(PORT, () => console.log("App is running "));