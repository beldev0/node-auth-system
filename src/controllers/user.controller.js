function UserControllerFactory (userService) {
    return {
        async me(req, res, next) {
            try {
                const result = await userService.me(req.user.id)
                if (result.success) {
                    return res.json(result)
                } 
                return res.status(400).json(result)
            } catch (err) { next(err) }
        }
    }
}

module.exports = UserControllerFactory