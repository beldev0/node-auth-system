const jwt = require('jsonwebtoken')

const authCheckerMiddleware = (blacklistRepo) => {
    return async (req, res, next) => {
        const authorizationHeaders = req.headers.authorization || ''
        const [schema, token] = authorizationHeaders.split(' ')

        if (!schema || !token) {
            next({ "statusCode": 401, name: "Custom Error", errors: "Authorization token is missing" })
        }
        try {
            const blacklistLine = await blacklistRepo.getBlacklistLine(token)
            console.log(blacklistLine);
            
            if (blacklistLine) {
                next({"statusCode": 401, name:"Custom Error", errors:"Access token provided are no longer valid"})
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
            if (!decoded) {
                next({ "statusCode": 401, name: "Token Error", errors: "Invalid access token provided" })
            }
            req.user = decoded
            next()
        } catch (err) {
            next(err)
        }
    }
}

module.exports = authCheckerMiddleware