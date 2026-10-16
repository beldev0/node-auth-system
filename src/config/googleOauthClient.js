const { OAuth2Client } = require('google-auth-library')

const oauthClient = new OAuth2Client({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
})

module.exports = oauthClient

