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
        },

        async updateProfil(req, res, next) {
            try {
                const data = req.body
                if(!data.email && !data.lastname && !data.firstname) {
                    return res.status(400).json({"success":false, error:["Update field are required"]})
                }
                const result = await userService.updateProfil({...req.body, user_id:req.user.id})
                return res.json({'success':true, data:result})
            } catch (err) { next(err) }
        }
    }
}

module.exports = UserControllerFactory