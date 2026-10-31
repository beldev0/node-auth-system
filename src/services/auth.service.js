const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const fsp = require('fs/promises')
const { getUploadDirPath } = require('./../utils/pathHelpers')
const { sendVerificationEmail, sendResetPasswordEmail } = require('./../utils/mailHelpers.js')
const path = require('path')
const jwtUtils = require('../utils/jwtUtils.js')
const jwt = require('jsonwebtoken')
const { OTP } = require('otplib')
const otp = new OTP({ strategy: 'totp' })
const QRCode = require('qrcode')
const axios = require('axios')
const { getLogger } = require('pino-correlation-id')
const pinoLogger = require('./../config/logger.js')

const authServiceFactory = (userRepository, tokenVerificationRepo, tokenRefreshRepository, loginHistoryRepo, blacklistedTokenRepo, resetPasswordRepo, oAuthAccountRepo) => {
    const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp']

    const issueAndSaveToken = async (payload, metadata, user) => {
        // Issue access, refresh tokens and hashed the refresh token
        const accessToken = jwtUtils.getAccessToken(payload)
        const refreshToken = jwtUtils.createRefreshToken(payload)
        const hashedRefreshToken = jwtUtils.hashToken(refreshToken)

        // Save refresh token with expiration date

        const expires_at = new Date()
        expires_at.setDate(expires_at.getDate() + 7)
        const data = { token: hashedRefreshToken, ...metadata, expires_at, user_id: user.id }
        await tokenRefreshRepository.createRefreshToken(data)

        return { accessToken, refreshToken }
    }

    // Remove uneccessary field from user object retrieve from the db
    const formatUserInfos = (user) => {
        user['nbre_session'] ? delete user['nbre_session'] : null
        delete user['password']
        if (!user.profil.startsWith('https://')) {
            user.profil = `${process.env.APP_HOST}/profil/${user.profil}`
        }
        return user
    }

    return {
        /*
            Process and validate profil image from buffer if given
                - validate mime type
                - create filename and write image bytes on disk
            Hash user password
            Create new user 
            Send verification mail (Fire and forget to accelerate request response speed )
         */
        async register(data, profil = null) {
            const log = getLogger(pinoLogger)
            log.debug({ data, profil }, "Registering service method starts")

            let filename
            if (profil) {
                const { fileTypeFromBuffer } = await import('file-type')
                const detected = await fileTypeFromBuffer(profil.buffer)
                if (detected) {
                    if (!ALLOWED_MIME.includes(detected.mime)) {
                        log.warn({ detected }, 'Invalid profil image given')
                        return { "success": false, error: ["Filetype not allowed"] }
                    }

                    filename = `${crypto.randomUUID()}.${detected.ext}`
                    const filepath = path.join(getUploadDirPath(), filename)
                    await fsp.writeFile(filepath, profil.buffer)
                    log.info({ filename }, 'Successfully on disk')
                }
            }

            data['password'] = await bcrypt.hash(data['password'], 10)

            const user = await userRepository.createUser({ ...data, profil: filename ?? null })
            log.info({ user }, 'New user created')

            if (!user.profil.startsWith('https://')) {
                user.profil = `${process.env.APP_HOST}/profil/${user.profil}`
            }
            const token = crypto.randomBytes(16).toString('hex')

            const expires_at = new Date()
            expires_at.setMinutes(expires_at.getMinutes() + 15)

            const verificationObj = { token, user_id: user.id, expires_at }
            await tokenVerificationRepo.createTokenVerification(verificationObj)
            log.info({ verificationObj }, 'Registration token generated and saved')

            const href = `${process.env.APP_HOST}/auth/${user.id}/verify/${token}`

            const username = `${user.firstname} ${user.lastname}`
            sendVerificationEmail(user.email, href, username)

            return {
                success: true, data: {
                    user,
                    message: "Verification email sent !"
                }
            }
        },

        // Validate user account 
        async verify({ id, token }) {
            const log = getLogger(pinoLogger)

            const verificationLine = await tokenVerificationRepo.getVerificationToken(token, id)

            if (!verificationLine) {
                log.warn({user_id : id, token}, "Unknown verification token given")
                return { "success": false, error: "User ID or token invalid" }
            }

            if (verificationLine.email_verified_at) {
                log.warn({user_id : id}, "User account already verified")
                return { "success": false, error: ["You're account is already verifed !"] }
            }

            if (verificationLine.expires_at.getTime() > Date.now()) {
                await userRepository.verifyUser(id)
                log.info({user_id:id}, "Account succcessfully verified")
                return { "success": true, data: "Account successfully verified ! You can login." }
            }

            log.warn({user_id : id, token}, "Verification token expired")
            return { "success": false, error: "Link already expired. Ask for new !" }
        },

        // resend verification mail again if user exist
        async resend_verification_mail(user_id) {
            const log = getLogger(pinoLogger)

            const user = await userRepository.getUserById(user_id)
            if (!user) {
                log.warn({user_id}, 'Account not found')
                return { success: false, error: "User not found" }
            }
            if (user) {
                if (user.email_verified_at) {
                    log.warn({user_id}, 'Account already verified')
                    return { success: false, error: "Your account is already verified" }
                }

                // generate verification toke 
                const token = crypto.randomBytes(16).toString('hex')

                const expires_at = new Date()
                expires_at.setMinutes(expires_at.getMinutes() + 15)

                const verificationObj = { token, user_id: user.id, expires_at }

                // save verification token to db
                await tokenVerificationRepo.createTokenVerification(verificationObj)

                const href = `${process.env.APP_HOST}/auth/${user.id}/verify/${token}`
                const username = `${user.firstname} ${user.lastname}`

                // Fire and forget email sending
                sendVerificationEmail(user.email, href, username)
                log.info({user}, 'Verification mail resent')

                return { success: true, message: "Verification email sent !" }
            }
        },

        /*
            get user credentials
            retrieve user account 
            return user data and tokens if account is verified and not disabled
         */
        async login(credentials, metadata) {
            const log = getLogger(pinoLogger)
            const { email, password } = credentials
            log.debug({ credentials, metadata }, 'Login service method start')

            const user = await userRepository.getUserByEmail(email)

            if (!user) {
                log.warn({credentials}, "Invalid credentials given")
                return {success: false, error: "Email or password are invalid"}
            }

            if (user.disabled_at) {
                log.warn({user}, "Account already disabled")
                return { success: false, error: "Your account is currently disabled" }
            }

            if (!user.email_verified_at) {
                log.warn({user}, "Account not verified")
                return { success: false, error: "Your account is not verified" }
            }

            if (user.nbre_session == 2) {
                log.warn({user}, "Login failed. 2 sessions ongoing")
                return { success: false, error: "You already have 2 sessions ongoing." }
            }

            if (bcrypt.compare(password, user.password)) {
                const payload = { email: user.email, id: user.id, role: user.role }
                const { accessToken, refreshToken } = await issueAndSaveToken(payload, metadata, user)
                const formatedUserData = formatUserInfos(user)

                await loginHistoryRepo.createHistory({ ...metadata, success: true, user_id: user.id })
                log.info({user}, "Successful login")
                return { success: true, data: { user: formatedUserData, accessToken }, refreshToken }

            } else {
                await loginHistoryRepo.createHistory({ ...metadata, success: false, user_id: user.id })
                log.info({user}, "Login failed. Invalid password")
                return { success: false, error: "Email or password are invalid" } // Mitigation 
            }
        },

        /*
            check given refresh token are valid 
            then revoke it and blacklist access token 
         */
        async logout({ refreshToken, accessToken, exp }) {
            const log = getLogger(pinoLogger)

            const expires_at = new Date(exp)
            const hashed = jwtUtils.hashToken(refreshToken)
            const refreshTokenLine = await tokenRefreshRepository.getRefreshToken(hashed)

            if (!refreshTokenLine) {
                log.warn({ token: refreshToken }, 'Unknwon refresh token get for logout')
                return { success: false, error: "Invalid refresh token sent" }
            }

            if (refreshTokenLine.revoked_at) {
                log.warn({ token: refreshToken }, 'Get revoked refresh token for logout')
                return { success: false, error: "Session is already finished !" }
            }

            await blacklistedTokenRepo.addBlacklistedToken({ token: accessToken, user_id: refreshTokenLine.user_id, expires_at })
            log.info({ token: accessToken }, 'Blacklist access token ')

            await tokenRefreshRepository.revokeRefreshToken(hashed)
            log.info({ token: refreshToken }, 'Revoked refresh token')
 
            return { success: true, message: "You're no longer connect !" }
        },

        // generate reset token and sent reset password mail
        async forgotPassword(email) {
            const log = getLogger(pinoLogger)
            const user = await userRepository.getUserByEmail(email)

            if (user) {
                const token = crypto.randomBytes(12).toString('hex')
                const expires_at = new Date()
                expires_at.setMinutes(expires_at.getMinutes() + 15)

                // send reset password mail
                sendResetPasswordEmail(to = user.email, code = token)
                await resetPasswordRepo.createResetToken({ token, user_id: user.id, expires_at })

                log.info({ email }, 'Reset password mail successfully sent')
                return { success: true, data: { user_id: user.id, message: "Reset password email successfully sent !" } }
            }
            log.warn({ email }, 'Associated account not FOUND')
            return { success: false, message: "Account not found !" }

        },

        // Edit user passsword by the given if password reset token still valid
        async resetPassword({ token, newPassword, user_id }) {
            const log = getLogger(pinoLogger)
            const tokenLine = await resetPasswordRepo.getResetToken({ token, user_id })

            if (!tokenLine) {
                log.warn({ token }, 'Invalid reset password token given')
                return { success: false, errors: ["User ID or token invalid"] }
            }

            if (!(tokenLine.expires_at.getTime() > Date.now())) {
                log.warn({ token }, 'Expired reset password token given')
                return { success: false, errors: ["Reset token already expired"] }
            }

            const hashPassword = await bcrypt.hash(newPassword, 10)
            await userRepository.updatePassword(user_id, hashPassword)
            log.info({ user_id }, "Password successfully changed")
            return { success: true, message: "Password successfully reset !" }
        },

        // Check user refresh token still valid to issue or not new access token
        async refresh(refreshToken) {
            const log = getLogger(pinoLogger)

            const hashedToken = jwtUtils.hashToken(refreshToken)
            const refreshTokenLine = await tokenRefreshRepository.getRefreshToken(hashedToken)
            if (!refreshTokenLine) {
                log.warn({ token: hashedToken }, 'Unknown refresh token')
                return { success: false, error: ['Received invalid refresh token'] }
            }

            if (refreshTokenLine.revoked_at) {
                log.warn({ token: hashedToken }, 'Revoked refresh token given')
                return { success: false, error: ['Token already revoked'] }
            }

            if (refreshTokenLine.expires_at.getTime() < Date.now()) {
                log.warn({ token: hashedToken }, 'Expired refresh token given')
                return { success: false, error: ['Log in. Token expired !'] }
            }

            const decoded = jwt.decode(refreshToken, process.env.REFRESH_TOKEN_SECRET)
            const payload = { id: decoded.id, email: decoded.email, role: decoded.role }
            const accessToken = jwtUtils.getAccessToken(payload)
            log.info({ decoded }, 'New access token generated')
            return { success: true, accessToken: accessToken }
        },

        /*
            Get and validate user data 
            if user email not already record :
                - Save user data
            - Format user infos and issue jwt tokens
            - Return both
        */
        async oauthRegistering(data, metadata, provider) {
            const log = getLogger(pinoLogger)
            log.debug({ data, metadata, provider }, 'Start user registering from oauth')
            let firstname, lastname;

            if (provider == 'github') {
                /*
                    Validate name field get from github to prevent case where lastname/firstname are not given because user don't filled 
                 */
                const { name } = data
                console.log(name.split(' '));

                [firstname, lastname] = name.trim().split(' ')
                console.log(firstname, lastname);

                if (!firstname || !lastname) {
                    const errors = ["Your github informations are not well filled. Lastname or firstname missing"]
                    log.warn({ errors })
                    return { success: false, errors }
                }
            }
            let user = await userRepository.getUserByEmail(data.email)
            log.debug({ user })
            if (!user) {
                const randomPassword = crypto.randomBytes(8).toString('hex')
                const hashPassword = await bcrypt.hash(randomPassword, 10)
                const userInfos = {
                    lastname: data.family_name || lastname,
                    firstname: data.given_name || firstname,
                    email: data.email,
                    profil: data.picture || data.avatar_url,
                    password: hashPassword,
                    email_verified_at: new Date()
                }

                user = await userRepository.createUser(userInfos)
                log.info({ user }, 'Created new user')
                const oauthInfo = { provider: provider, provider_id: data.sub || data.id, user_id: user.id }
                await oAuthAccountRepo.createOauthAccount(oauthInfo)
            }

            if (user.nbre_session == 2) {
                log.warn({ user }, 'Login failed. 2 sessions ongoing')
                await loginHistoryRepo.createHistory({ ...metadata, success: false, user_id: user.id })
                return { success: false, error: "You already have 2 sessions ongoing." }
            }

            const payload = { email: user.email, id: user.id, role: user.role }
            const { accessToken, refreshToken } = await issueAndSaveToken(payload, metadata, user)

            const formatedUserData = await formatUserInfos(user)

            await loginHistoryRepo.createHistory({ ...metadata, success: true, user_id: user.id })
            log.info('Format user data and issue tokens')
            return { success: true, data: { user: formatedUserData, accessToken }, refreshToken }
        },

        /*
            handle github oauth login second part
            get access token to query github api and retrive user data
            get user infos and call oauth registration service method
         */
        async githubAuthCallback(code, metadata) {
            const log = getLogger(pinoLogger)
            try {
                // Request github to get access token for following request
                const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code
                },
                    {
                        headers: { Accept: 'application/json' }
                    })
                log.info('Get access token from github')

                const access_token = tokenRes.data.access_token

                // Request github to get user information
                const user = await axios.get('https://api.github.com/user', {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                })
                log.info({ user }, 'Get user infos from github')

                const result = await this.oauthRegistering(user.data, metadata, 'github')
                log.info({ result }, 'Github callback end')
 
                return result 
            } catch (err) { throw err }
        },

        /*
            get user account
            return error if two factor auth is already enabled
            else generate two factor secret code 
            generate totp url and convert in buffer
         */
        async setup2fa(user_id) {
            const log = getLogger(pinoLogger)

            const user = await userRepository.getUserById(user_id)
            if (user.two_factor_enabled_at) {
                log.warn({ user_id }, 'Two factor already enabled.')
                return { success: false, error: ["Two factor already enabled"] }
            }

            const secret = otp.generateSecret()
            log.debug({ user_id }, 'Two factor secret generated')

            const updatedInfos = { user_id: user.id, secret }
            await userRepository.updateProfil(updatedInfos)
            log.info({ user_id }, 'Save secret key in user data')

            // generate totp url for qr code generation
            const otpauth = otp.generateURI({
                issuer: "AUTH SYS APP",
                secret: secret,
                label: user.email
            })
            log.debug({otpauth}, 'otpauth')
            // Generate data url
            const dataUrl = await QRCode.toDataURL(otpauth)
            log.debug({ user_id }, 'Date url generated from totp url')

            return { success: true, data: {secret, dataUrl} }
        },

        // disable 2FA on user account if enabled

        async disabled2fa(user_id) {
            const log = getLogger(pinoLogger)

            const user = await userRepository.getUserById(user_id)
            if (!user.two_factor_enabled_at) {
                log.warn({ user_id }, 'Two factor not enabled. It can be disabled do')
                return { success: false, error: ["Two factor isn't enable"] }
            }
            await userRepository.switchTwoFactor(user_id = user.id, value = null)
            log.info({ user_id }, '2FA auth disabled')
            return { success: true, message: ["Two factor disabled"] }
        },

        // validate totp code from user to enable 2FA on his account

        async verify2fa(code, user_id) {
            const log = getLogger(pinoLogger)

            const user = await userRepository.getUserById(user_id)
            if (user.two_factor_enabled_at) {
                log.warn({ user_id }, 'Two factor already enabled.')
                return { success: false, message: "2FA already enabled." }
            }

            // Check if code given by user match with the secret recorded
            const ok = await otp.verify({ token: code, secret: user.two_factor_secret })
            log.debug({ result: ok }, '2FA code checking result')

            if (ok.valid) {
                const enabled_at = new Date()
                await userRepository.switchTwoFactor(user_id = user.id, value = enabled_at)
                log.info({ user_id }, '2FA successfully enabled')
                return { success: true, message: "2FA successfully enabled !" }
            } else {
                log.warn({ user_id }, "2FA enable failed. Code don't match")
                return { success: false, message: "2FA enabling failded. Code invalid" }
            }
        },

        /*
            login 2nd step for account with 2FA enabled
            check code get from user 
            return user and tokens if match with mfa secret else return error
         */
        async login2fa(code, user_id, metadata) {
            const log = getLogger(pinoLogger)

            const user = await userRepository.getUserById(user_id)
            const ok = await otp.verify({ token: code, secret: user.two_factor_secret })

            log.debug({ result: ok }, '2FA code checking result')

            if (ok.valid) {
                const payload = { email: user.email, id: user.id, role: user.role }
                const { accessToken, refreshToken } = await issueAndSaveToken(payload, metadata, user)
                const formatedUserData = formatUserInfos(user)

                await loginHistoryRepo.createHistory({ ...metadata, success: true, user_id: user.id })
                log.info({ user }, '2FA login successfully passed')
                return { success: true, data: { user: formatedUserData, accessToken }, refreshToken }
            }

            log.warn({ user }, '2FA login failed')
            return { success: false, errors: ['Authenticator code is invalid. Verification failed'] }
        }
    }
}

module.exports = authServiceFactory