const router = require('express').Router()
const pool = require('./../config/db.js')

const userValidator = require('./../validators/users.validator.js')
const validatorMiddleware = require('./../middlewares/validator.midddleware.js')
const authCheckerMiddlewareFactory = require('./../middlewares/authChecker.middleware.js')
const uploader = require('./../config/multer.js')

const authServiceFactory = require('./../services/auth.service.js')
const blacklistedRepoFactory = require('./../repositories/blacklistedToken.repository.js')
const resetPasswordRepoFactory = require('./../repositories/resetPasswordToken.repository.js')
const tokenVerificationRepoFactory = require('./../repositories/tokenVerifcation.repository.js')
const loginHistoryRepoFactory = require('./../repositories/loginHistory.repository.js')
const userRepoFactory = require('./../repositories/user.repository.js')
const refreshTokenRepoFactory = require('./../repositories/refreshtoken.repository.js')
const authControllerFactory = require('./../controllers/auth.controller.js')


const userRepo = userRepoFactory(pool)
const blacklistedRepo = blacklistedRepoFactory(pool)
const resetPasswordRepo = resetPasswordRepoFactory(pool)
const refreshTokenRepo = refreshTokenRepoFactory(pool)
const tokenVerificationRepo = tokenVerificationRepoFactory(pool)
const loginHistoryRepo = loginHistoryRepoFactory(pool)
const authService = authServiceFactory(userRepo, tokenVerificationRepo, refreshTokenRepo, loginHistoryRepo, blacklistedRepo, resetPasswordRepo)
const authController = authControllerFactory(authService)

const authCheckerMiddleware = authCheckerMiddlewareFactory(blacklistedRepo)


router.post('/register', uploader.single('profil'), validatorMiddleware(userValidator.create),  authController.register)
router.post('/login', uploader.none() , validatorMiddleware(userValidator.login), authController.login)
router.post('/logout', authCheckerMiddleware, authController.logout)  
router.post('/forgot-password', validatorMiddleware(userValidator.forgotPassword) , authController.forgotPassword)
router.post('/reset-password', validatorMiddleware(userValidator.resetPassword), authController.resetPassword)
router.post('/:id/resend-verification-mail', authController.resend_verification_mail)
router.get('/:id/verify/:token', authController.verify)
module.exports = router