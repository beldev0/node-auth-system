const router = require('express').Router()
const pool = require('./../config/db.js')

const userValidator = require('./../validators/users.validator.js')
const validatorMiddleware = require('./../middlewares/validator.midddleware.js')
const uploader = require('./../config/multer.js')

const authServiceFactory = require('./../services/auth.service.js')
const tokenVerificationRepoFactory = require('./../repositories/tokenVerifcation.repository.js')
const userRepoFactory = require('./../repositories/user.repository.js')
const refreshTokenRepoFactory = require('./../repositories/refreshtoken.repository.js')
const authControllerFactory = require('./../controllers/auth.controller.js')

const userRepo = userRepoFactory(pool)
const refreshTokenRepo = refreshTokenRepoFactory(pool)
const tokenVerificationRepo = tokenVerificationRepoFactory(pool)
const authService = authServiceFactory(userRepo, tokenVerificationRepo, refreshTokenRepo)
const authController = authControllerFactory(authService)


router.post('/register', uploader.single('profil'), validatorMiddleware(userValidator.create),  authController.register)
router.post('/login', uploader.none() , validatorMiddleware(userValidator.login), authController.login)
router.get('/:id/verify/:token', authController.verify)

module.exports = router