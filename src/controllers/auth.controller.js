const authControllerFactory = (authService) => {
    return {
        async register(req, res, next) {
            try {
                const result = await authService.register(req.body, req.file)
                if (result.success) {
                    return res.status(201).json(result)
                }
                return res.status(400).json(result)
            } catch (err) { next(err) }
        },

        async verify(req, res, next) {
            try {
                const result = await authService.verify(req.params)
                if (result.success) {
                    return res.json(result)
                } else {
                    return res.status(400).json(result)
                }
            } catch (err) { next(err) }
        },

        async resend_verification_mail(req, res, next) {
            try {
                const result = await authService.resend_verification_mail(req.params.id)
                if (result.success) {
                    return res.json(result)
                }
                return res.status(400).json(result)
            } catch (err) { next(err) }
        },

        async login(req, res, next) {
            try {
                const credentials = req.body
                const metadata = { ip_address: req.ip, user_agent: req.headers['user-agent'] }
                const result = await authService.login(credentials, metadata)
                if (result.success) {
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
            try {
                const result = await authService.forgotPassword(req.body.email)
                if (result.success) {
                    return res.json(result)
                }
                return res.status(404).json(result)

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
                return res.status(401).json({success:false, error:["You have to include cookie"]})
            }
            try {
                const result = await authService.refresh(refreshToken)
                if (result.success) {
                    res.json(result)
                } else {
                    res.status(401).json(result)
                }
            } catch (err) { next(err) }
        }
    }
}

module.exports = authControllerFactory