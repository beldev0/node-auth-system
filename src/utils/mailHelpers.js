const transporter = require('./../config/nodemailer.js')
const emailVerificationTemplate = require('./../templates/emailVerification.template.js')
const passwordResetTemplate = require('./../templates/forgotPassword.template.js')

async function sendVerificationEmail(to, href, name) {
    const mailOptions = {
        from : process.env.SMTP_USER,
        to : to,
        subject : "Email verification link",
        html : emailVerificationTemplate(name, href)
    }

    return await transporter.sendMail(mailOptions)
}

async function sendResetPasswordEmail(to, code) {
    const mailOptions = {
        from : process.env.SMTP_USER,
        to : to,
        subject : "Password reset code",
        html : passwordResetTemplate(code)
    }

    return await transporter.sendMail(mailOptions)
}

module.exports = { sendVerificationEmail, sendResetPasswordEmail }