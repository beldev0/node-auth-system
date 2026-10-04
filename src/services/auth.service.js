const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const fsp = require('fs/promises')
const { getUploadDirPath } = require('./../utils/pathHelpers')
const { sendVerificationEmail } = require('./../utils/mailHelpers.js')
const path = require('path')

const authServiceFactory = (userRepository, tokenRefreshRepository) => {
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
                    delete data['confirm_password']
                    let password = data['password']
                    password = await bcrypt.hash(password, 10)
                    data['password'] = password

                    const filepath = path.join(getUploadDirPath(), filename)
                    await fsp.writeFile(filepath, profil.buffer)
                }
            }

            const user = await userRepository.createUser({ ...data, profil: filename ?? null })
            console.log(user);

            if (!user.profil.startsWith('https://')) {
                user.profil = `${process.env.APP_HOST}/profil/${user.profil}`
            }
            const token = crypto.randomBytes(16).toString('hex')
            console.log("Token", token);

            const expires_at = new Date()
            expires_at.setMinutes(expires_at.getMinutes() + 15)
            console.log(expires_at.getTime());

            const verificationObj = { token, user_id: user.id, expires_at }
            await tokenRefreshRepository.createTokenVerification(verificationObj)

            const href = `http://${process.env.APP_HOST}/auth/${user.id}/verify/${token}`
            console.log(href);

            const username = `${user.firstname} ${user.lastname}`
            await sendVerificationEmail(user.email, href, username)

            return {
                success: true, data: {
                    user,
                    message: "Verfication email sent !"
                }
            }
        },

        async verify({id, token}) {
            const verificationLine = await tokenRefreshRepository.getVerificationToken(token, id)
            // console.log(verificationLine);
            
            if (!verificationLine) {
                return {"success":false, error : "User ID or token invalid"}
            }

            if (verificationLine.email_verified_at) {
                return {"success":false, error:["You're account is already verifed !"]}
            }

            if(verificationLine.expires_at.getTime() > Date.now()) {
                await userRepository.verifyUser(id)
                return {"success":true, error:"Account successfully verified ! You can login."}
            } 
            return {"success":false, error : "Link already expired. Ask for new !"}
        }
    }
}

module.exports = authServiceFactory