const router = require('express').Router()

const pool = require('./../config/db.js')
const loginHistoryRepoFactory = require('./../repositories/loginHistory.repository.js')
const refreshTokenRepoFactory = require('./../repositories/refreshtoken.repository.js')
const userRepoFactory = require('./../repositories/user.repository.js')
const adminServiceFactory = require('./../services/admin.service.js')
const adminControllerFactory = require('./../controllers/admin.controller.js')

const loginHistoryRepo = loginHistoryRepoFactory(pool)
const refreshTokenRepo = refreshTokenRepoFactory(pool)
const userRepo = userRepoFactory(pool)

const adminService = adminServiceFactory(loginHistoryRepo, refreshTokenRepo, userRepo)
const adminController = adminControllerFactory(adminService)

router.get('/sessions', adminController.listSessions)
router.get('/histories', adminController.getLoginHistory)
router.patch('/disable/:id', adminController.disableAccount)

module.exports =  router