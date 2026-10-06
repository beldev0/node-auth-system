const router = require('express').Router()
const pool = require('./../config/db.js')

const userRepoFactory = require('./../repositories/user.repository')
const userControllerFactory = require('./../controllers/user.controller.js')
const userServiceFactory = require('./../services/user.service.js')

const userRepo = userRepoFactory(pool)
const userService = userServiceFactory(userRepo)
const userController = userControllerFactory(userService)


router.get('', userController.me)

module.exports = router