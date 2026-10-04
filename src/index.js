require('dotenv').config()
const express = require('express')

const { createPublicsFolder } = require('./config/bootstrap.js')
const { getUploadDirPath } = require('./utils/pathHelpers.js')
const globalErrorMiddleware = require('./middlewares/globalError.middleware.js')
const authRouter = require('./routes/auth.route.js')
const app = express();

app.use(express.json())

app.use('/profil', express.static(getUploadDirPath()))

app.use('/auth', authRouter)

app.get('/health', (req, res) => res.send("Server is up..."))

app.all('{/*any}', (req, res) => {
    return res.status(404).json({success:false, errors : "URL NOT FOUND"})
})

app.use(globalErrorMiddleware)

const PORT  = process.env.PORT || 3000

createPublicsFolder()

app.listen(PORT, () => console.log("App is running "));