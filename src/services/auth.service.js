const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const fsp = require('fs/promises')
const { getUploadDirPath } = require('./../utils/pathHelpers')
const { sendVerificationEmail, sendResetPasswordEmail } = require('./../utils/mailHelpers.js')
const path = require('path')
const jwtUtils = require('../utils/jwtUtils.js')
const jwt = require('jsonwebtoken')
const { OTP } = require('otplib')
const otp = new OTP({strategy: 'totp'})
const QRCode = require('qrcode')

const authServiceFactory = (userRepository, tokenVerificationRepo, tokenRefreshRepository, loginHistoryRepo, blacklistedTokenRepo, resetPasswordRepo, oAuthAccountRepo) => {
    const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp']
    return {
        async register(data, profil = null) {
            let filename
            if (profil) {
                const { fileTypeFromBuffer } = await import('file-type')
                const detected = await fileTypeFromBuffer(profil.buffer)
                if (detected) {
                    if (!ALLOWED_MIME.includes(detected.mime)) {
                        return { "success": false, error: ["Filetype not allowed"] }
                    }

                    filename = `${crypto.randomUUID()}.${detected.ext}`
                    const filepath = path.join(getUploadDirPath(), filename)
                    await fsp.writeFile(filepath, profil.buffer)
                }
            }

            delete data['confirm_password']
            let password = data['password']
            password = await bcrypt.hash(password, 10)
            data['password'] = password

            const user = await userRepository.createUser({ ...data, profil: filename ?? null })

            if (!user.profil.startsWith('https://')) {
                user.profil = `${process.env.APP_HOST}/profil/${user.profil}`
            }
            const token = crypto.randomBytes(16).toString('hex')

            const expires_at = new Date()
            expires_at.setMinutes(expires_at.getMinutes() + 15)

            const verificationObj = { token, user_id: user.id, expires_at }
            await tokenVerificationRepo.createTokenVerification(verificationObj)

            const href = `http://${process.env.APP_HOST}/auth/${user.id}/verify/${token}`

            const username = `${user.firstname} ${user.lastname}`
            await sendVerificationEmail(user.email, href, username)

            return {
                success: true, data: {
                    user,
                    message: "Verification email sent !"
                }
            }
        },

        async verify({ id, token }) {
            const verificationLine = await tokenVerificationRepo.getVerificationToken(token, id)

            if (!verificationLine) {
                return { "success": false, error: "User ID or token invalid" }
            }

            if (verificationLine.email_verified_at) {
                return { "success": false, error: ["You're account is already verifed !"] }
            }

            if (verificationLine.expires_at.getTime() > Date.now()) {
                await userRepository.verifyUser(id)
                return { "success": true, data: "Account successfully verified ! You can login." }
            }
            return { "success": false, error: "Link already expired. Ask for new !" }
        },

        async resend_verification_mail(user_id) {
            const user = await userRepository.getUserById(user_id)
            if (!user) {
                return { success: false, error: "User not found" }
            }
            if (user) {
                if (user.email_verified_at) {
                    return { success: false, error: "Your account is already verified" }
                }

                const token = crypto.randomBytes(16).toString('hex')

                const expires_at = new Date()
                expires_at.setMinutes(expires_at.getMinutes() + 15)
                console.log(expires_at.getTime());

                const verificationObj = { token, user_id: user.id, expires_at }
                await tokenVerificationRepo.createTokenVerification(verificationObj)

                const href = `http://${process.env.APP_HOST}/auth/${user.id}/verify/${token}`

                const username = `${user.firstname} ${user.lastname}`
                await sendVerificationEmail(user.email, href, username)

                return { success: true, message: "Verification email sent !" }
            }
        },

        async login(credentials, metadata) {
            const { email, password } = credentials

            const user = await userRepository.getUserByEmail(email)

            if (!user) {
                return { success: false, error: "Email or password are invalid" }
            }

            if (user.disabled_at) {
                return { success: false, error: "Your account is currently disabled" }
            }

            if (!user.email_verified_at) {
                return { success: false, error: "Your account is not verified" }
            }

            if (user.nbre_session == 2) {
                return { success: false, error: "You already have 2 sessions ongoing." }
            }


            if (bcrypt.compare(password, user.password)) {
                const payload = { email: user.email, id: user.id }
                const accessToken = jwtUtils.getAccessToken(payload)
                const refreshToken = jwtUtils.createRefreshToken(payload)
                const hashedRefreshToken = jwtUtils.hashToken(refreshToken)
                const expires_at = new Date()
                expires_at.setDate(expires_at.getDate() + 7)
                const data = { token: hashedRefreshToken, ...metadata, expires_at, user_id: user.id }
                await tokenRefreshRepository.createRefreshToken(data)

                delete user['password']
                if (!user.profil.startsWith('https://')) {
                    user.profil = `${process.env.APP_HOST}/profil/${user.profil}`
                }
                await loginHistoryRepo.createHistory({ ...metadata, success: true, user_id: user.id })
                return { success: true, data: { user, accessToken }, refreshToken }

            } else {
                await loginHistoryRepo.createHistory({ ...metadata, success: false, user_id: user.id })
                return { success: false, error: "Email or password are invalid" } // Mitigation 
            }
        },

        async logout({ refreshToken, accessToken, exp }) {
            const expires_at = new Date(exp)
            const hashed = jwtUtils.hashToken(refreshToken)
            const refreshTokenLine = await tokenRefreshRepository.getRefreshToken(hashed)

            if (!refreshTokenLine) {
                return { success: false, error: "Invalid cookies sent" }
            }

            if (refreshTokenLine.revoked_at) {
                return { success: false, error: "Session is already finished !" }
            }

            await blacklistedTokenRepo.addBlacklistedToken({ token: accessToken, user_id: refreshTokenLine.user_id, expires_at })
            await tokenRefreshRepository.revokeRefreshToken(hashed)
            return { success: true, message: "You're no longer connect !" }
        },

        async forgotPassword(email) {
            const user = await userRepository.getUserByEmail(email)            
            if (user) {
                const token = crypto.randomBytes(12).toString('hex')
                const expires_at = new Date()
                expires_at.setMinutes(expires_at.getMinutes() + 15)
                await sendResetPasswordEmail(to = user.email, code = token)
                await resetPasswordRepo.createResetToken({ token, user_id: user.id, expires_at })
                return { success: true, data: { user_id: user.id, message: "Reset password email successfully sent !" } }
            }
            return { success: false, message: "Account not found !" }

        },

        async resetPassword({ token, newPassword, user_id }) {            
            const tokenLine = await resetPasswordRepo.getResetToken({ token, user_id })
            
            if (!tokenLine) {
                return { success: false, errors: ["User ID or token invalid"] }
            }

            if (!(tokenLine.expires_at.getTime() > Date.now())) {
                return { success: false, errors: ["Reset token already expired"] }
            }

            const hashPassword = await bcrypt.hash(newPassword, 10)
            await userRepository.updatePassword(user_id, hashPassword)
            return { success: true, message: "Password successfully reset !" }
        },

        async refresh(refreshToken) {
            const hashedToken = jwtUtils.hashToken(refreshToken)
            const refreshTokenLine = await tokenRefreshRepository.getRefreshToken(hashedToken)
            if (!refreshTokenLine) {
                return {success:false, error : ['Received invalid refresh token']}
            }

            if (refreshTokenLine.revoked_at) {
                return {success:false, error : ['Token already revoked']}
            }

            if (refreshTokenLine.expires_at.getTime() < Date.now()) {
                return {success:false, error : ['Log in. Token expired !']}
            }

            const decoded = jwt.decode(refreshToken, process.env.REFRESH_TOKEN_SECRET)
            const payload = {id : decoded.id, email:decoded.email}
            const accessToken = jwtUtils.getAccessToken(payload)
            return {success:true, accessToken:accessToken}
        },

        async oauthRegistering(data, metadata) {
            let user = await userRepository.getUserByEmail(data.email)
            if (!user) {
                const randomPassword = crypto.randomBytes(8).toString('hex')
                const hashPassword = await bcrypt.hash(randomPassword, 10)
                const userInfos = {
                    lastname            : data.family_name,
                    firstname           : data.given_name,
                    email               : data.email,
                    profil              : data.picture,
                    password            : hashPassword,
                    email_verified_at   : new Date()
                }

               user = await userRepository.createUser(userInfos)
               const oauthInfo = { provider: "google", provider_id : data.sub, user_id:user.id }
               await oAuthAccountRepo.createOauthAccount(oauthInfo)
            }
           
            const payload = { email: user.email, id: user.id }
            const accessToken = jwtUtils.getAccessToken(payload)
            const refreshToken = jwtUtils.createRefreshToken(payload)
            const hashedRefreshToken = jwtUtils.hashToken(refreshToken)
            const expires_at = new Date()
            expires_at.setDate(expires_at.getDate() + 7)
            const dataRefreshToken = { token: hashedRefreshToken, ...metadata, expires_at, user_id: user.id }
            await tokenRefreshRepository.createRefreshToken(dataRefreshToken)

            delete user['password']
            if (!user.profil.startsWith('https://')) {
                user.profil = `${process.env.APP_HOST}/profil/${user.profil}`
            }
            await loginHistoryRepo.createHistory({ ...metadata, success: true, user_id: user.id })
            return { success: true, data: { user, accessToken }, refreshToken }
        },

        async setup2fa(user_id) {            
            const user = await userRepository.getUserById(user_id)
                        
            if (user.two_factor_enabled_at) {
                return {success:false, error:["Two factor already enabled"]}
            }
            
            const secret = otp.generateSecret()
            
            const updatedInfos = {user_id:user.id, secret}
            await userRepository.updateProfil(updatedInfos)
            
            const otpauth = otp.generateURI({
                issuer : "AUTH SYS APP",
                secret : secret,
                label : user.email
            })
            console.log(otpauth);
            
            const dataURLBuffer = await QRCode.toBuffer(otpauth)

            return { success:true, qr:dataURLBuffer }
        },

        async disabled2fa(user_id) {
            const user = await userRepository.getUserById(user_id)
            
            if (!user.two_factor_enabled_at) {
                return {success:false, error:["Two factor isn't enable"]}
            }
            await userRepository.switchTwoFactor(user_id=user.id, value=null)
            return {success:true, message:["Two factor disabled"]}

        },

        async verify2fa(code, user_id) {
            const user = await userRepository.getUserById(user_id)
            if (user.two_factor_enabled_at) {
                return {success:false, message:"2FA already enabled."}
            }

            const ok = await otp.verify({token :code, secret:user.two_factor_secret})
            if (ok.valid) {
                const enabled_at = new Date()
                await userRepository.switchTwoFactor(user_id=user.id, value=enabled_at)
                return {success:true, message:"2FA successfully enabled !"}
            } else {
                return {success:false, message:"2FA enabling failded. Code invalid"}
            }
        },

        async login2fa(code, user_id, metadata) {
            const user = await userRepository.getUserById(user_id)
            const ok = await otp.verify({token:code, secret:user.two_factor_secret})
            console.log(ok);
            
            if (ok.valid) {
                const payload = { email: user.email, id: user.id }
                const accessToken = jwtUtils.getAccessToken(payload)
                const refreshToken = jwtUtils.createRefreshToken(payload)
                const hashedRefreshToken = jwtUtils.hashToken(refreshToken)
                const expires_at = new Date()
                expires_at.setDate(expires_at.getDate() + 7)
                const dataRefreshToken = { token: hashedRefreshToken, ...metadata, expires_at, user_id: user.id }
                await tokenRefreshRepository.createRefreshToken(dataRefreshToken)

                delete user['password']
                if (!user.profil.startsWith('https://')) {
                    user.profil = `${process.env.APP_HOST}/profil/${user.profil}`
                }
                await loginHistoryRepo.createHistory({ ...metadata, success: true, user_id: user.id })
                return { success: true, data: { user, accessToken }, refreshToken }
            } 
            return {success:false, errors: ['Authenticator code is invalid. Verification failed']}
        }

        
    }

}

module.exports = authServiceFactory