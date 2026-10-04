const userValidator = require("../validators/users.validator");

const validatorMiddleware = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body)
        if (!result.success) {
            const errors = result.error.flatten().fieldErrors
            next({statusCode:400, name: "Input Validation", errors})
        } else {
            req.body = result.data
            next()
        }
    }
}


module.exports = validatorMiddleware