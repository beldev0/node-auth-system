const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const jwtUtils = {
    getAccessToken(payload) {
       return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' })
    },

    createJti() {
        return crypto.randomBytes(16)
    },

    createRefreshToken(payload) {
        const jti = this.createJti()
        const data = {...payload, jti}
        return jwt.sign(data, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
    },

    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex')
    }
}

module.exports = jwtUtils