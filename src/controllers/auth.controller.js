const authControllerFactory = (authService) =>  {
    return {
        async register(req, res, next) {
            try {
                const result =  await authService.register(req.body, req.file)
                if (result.success) {
                    return res.status(201).json(result)
                }
                return res.status(400).json(result)
            } catch (err) { next(err) }
        }
    }
}

module.exports = authControllerFactory