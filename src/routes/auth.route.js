const router = require('express').Router()
const pool = require('./../config/db.js')

const userValidator = require('./../validators/users.validator.js')
const validatorMiddleware = require('./../middlewares/validator.midddleware.js')
const uploader = require('./../config/multer.js')

const authServiceFactory = require('./../services/auth.service.js')
const tokenRefreshRepoFactory = require('./../repositories/tokenVerifcation.repository.js')
const userRepoFactory = require('./../repositories/user.repository.js')
const authControllerFactory = require('./../controllers/auth.controller.js')

const userRepo = userRepoFactory(pool)
const tokenRefreshRepo = tokenRefreshRepoFactory(pool)
const authService = authServiceFactory(userRepo, tokenRefreshRepo)
const authController = authControllerFactory(authService)


router.post('/register', uploader.single('profil'), validatorMiddleware(userValidator.create),  authController.register)

module.exports = router