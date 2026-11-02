const userValidator = require("../validators/users.validator");

const validatorMiddleware = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body || {})
        
        if (!result.success) {
            const errors = result.error.flatten().fieldErrors
            req.log.warn({user : req.body, errors}, 'Invalid input given')
            next({statusCode:400, name: "Custom Error", errors})
        } else {
            req.log.debug({'layer':"VALIDATOR MIDDLEWWARE", cleaned_user:result.data})
            req.body = result.data
            next()
        }
    }
}


module.exports = validatorMiddleware