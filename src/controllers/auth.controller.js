const oauth = require('./../config/googleOauthClient.js')
const logger = require('./../config/logger.js')

const authControllerFactory = (authService) => {
    return {
        async register(req, res, next) {
            try {
                const result = await authService.register(req.body, req.file)
                // req.log.debug({result}, 'Register controller method')
                const status = result.success ? 201 : 400
                return res.status(status).json(result)
            } catch (err) { next(err) }
        },

        async verify(req, res, next) {
            try {
                const result = await authService.verify(req.params)
                const status = result.success ? 200 : 400
                return res.status(status).json(result)
            } catch (err) { next(err) }
        },

        async resend_verification_mail(req, res, next) {
            try {
                const result = await authService.resend_verification_mail(req.params.id)
                const status = result.success ? 200 : 400
                return res.status(status).json(result)
            } catch (err) { next(err) }
        },

        async login(req, res, next) {
            try {
                const credentials = req.body
                const metadata = { ip_address: req.ip, user_agent: req.headers['user-agent'] }
                const result = await authService.login(credentials, metadata)
                if (result.success) {

                    if (result.data.user.two_factor_enabled_at) {
                        return res.json({ success: true, mfa_required: true, user_id: result.data.user.id })
                    }

                    res.cookie('refreshToken', result.refreshToken, {
                        maxAge: 7 * 24 * 60 * 60 * 1000,
                        httpOnly: true,
                        path: '/auth/',
                        secure: process.env.NODE_ENV == 'production',
                        sameSite: 'Lax'
                    })
                    return res.json({ success: true, data: result.data })
                } else {
                    return res.status(400).json(result)
                }
            } catch (err) { next(err) }
        },

        async logout(req, res, next) {
            try {
                const refreshToken = req.cookies?.refreshToken
                if (!refreshToken) return res.status(400).json({ "success": false, error: "Cookies was not included" })
                const accessToken = req.headers.authorization.split(' ').at(-1)
                const result = await authService.logout({ refreshToken, accessToken, exp: req.user.exp })
                if (result.success) {
                    res.clearCookie(refreshToken)
                    return res.json(result)
                }
                return res.status(400).json(result)

            } catch (err) { next(err) }
        },

        async forgotPassword(req, res, next) {  
            req.log.info('')          
            try {
                const result = await authService.forgotPassword(req.body.email)
                const status = result.success ? 200 : 404 // 404 for user account not found
                return res.status(status).json(result)
            } catch (err) { next(err) }
        },

        async resetPassword(req, res, next) {
            try {
                const result = await authService.resetPassword(req.body)
                return res.json(result)
            } catch (err) { next(err) }
        },

        async refresh(req, res, next) {
            const refreshToken = req.cookies?.refreshToken
            if (!refreshToken) {
                return res.status(401).json({ success: false, error: ["You have to include cookie"] })
            }
            try {
                const result = await authService.refresh(refreshToken)
                const status = result.success ? 200 : 401
                return res.status(status).json(result)
            } catch (err) { next(err) }
        },

        async getOauthLink(req, res, next) {
            try {
                const googleLink = oauth.generateAuthUrl({
                    access_type: 'offline',
                    prompt: 'consent',
                    scope: ['openid', 'email', 'profile', 'email'],
                })
                const githubLink = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user`
                res.json({"success":true, data: {googleLink, githubLink}})
                req.log.info('Oauth link generated and sent')
            } catch (err) { next(err) }
        },

        async googleAuthCallback(req, res, next) {
            const code = req.query.code
            const metadata = { ip_address: req.ip, user_agent: req.headers['user-agent'] }

            try {
                const { tokens } = await oauth.getToken(code)
                if (!tokens.id_token) {
                    return res.status(400).json({
                        message: "No id_token is present"
                    })
                }
                const ticket = await oauth.verifyIdToken(
                    {
                        idToken: tokens.id_token,
                        audience: process.env.GOOGLE_CLIENT_ID
                    }
                )
                const payload = ticket.getPayload()
                const result = await authService.oauthRegistering(payload, metadata, 'google')
                if (result.success) {
                    res.cookie('refreshToken', result.refreshToken, {
                        maxAge: 7 * 24 * 60 * 60 * 1000,
                        httpOnly: true,
                        path: '/auth/',
                        secure: process.env.NODE_ENV == 'production',
                        sameSite: 'Lax'
                    })
                    return res.json({ success: true, data: result.data })
                } 
                return res.json(result)

            } catch (err) { next(err) }
        },

        async githubAuthCallback(req, res, next) {
            const metadata = { ip_address: req.ip, user_agent: req.headers['user-agent'] }
            const code = req.query.code || ''
            if (!code) {
                return res.status(400).json({success:false, errors:['Provider authorization code is missing']})
            }
            try {
                const result = await authService.githubAuthCallback(code, metadata)
                if (result.success) {
                    res.cookie('refreshToken', result.refreshToken, {
                        maxAge : 7 * 24 * 60 * 60 * 1000,
                        sameSite : 'Lax',
                        httpOnly : true,
                        secure : process.env.NODE_ENV == 'production',
                        path : '/auth/'
                    })
                    return res.json({success:true, data:result.data})
                } 
                return res.status(400).json(result)
            } catch (err) { next(err)}
           
        },

        async setup2fa(req, res, next) {
            const { id } = req.user
            try {
                const result = await authService.setup2fa(id)
                const status = result.success ? 200 : 400
                return res.status(status).json(result)
            } catch (err) { next(err) }
        },

        async disable2Fa(req, res, next) {
            const { id } = req.user
            try {
                const result = await authService.disabled2fa(id)
                const status = result.success ? 200 : 400
                return res.status(status).json(result)
            } catch (err) { next(err) }
        },

        async confirm2fa(req, res, next) {
            const { id } = req.user
            const codeAuth = req.body.code || null
            if (!codeAuth) {
                return res.status(400).json({ "success": false, erorrs: ["Authenticator code is missing"] })
            }

            try {
                const result = await authService.verify2fa(code = codeAuth, user_id = id)
                const status = result.success ? 200 : 400
                return res.status(status).json(result)
            } catch (err) { next(err) }
        },

        async login2fa(req, res, next) {
            const meta = { ip_address: req.ip, user_agent: req.headers['user-agent'] }

            try {
                const result = await authService.login2fa(code = req.body.code, user_id = req.body.user_id, metadata = meta)
                if (result.success) {
                    res.cookie('refreshToken', result.refreshToken, {
                        maxAge: 7 * 24 * 60 * 60 * 1000,
                        secure: process.env.NODE_ENV == 'production',
                        path: '/auth',
                        httpOnly: true,
                        sameSite: 'Lax'
                    })
                    return res.json({ success: true, data: result.data })
                }
                return res.json(result)
            } catch (err) { next(err) }
        }

    }
}

module.exports = authControllerFactory