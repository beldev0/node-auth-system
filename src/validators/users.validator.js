const { z } = require('zod')

const userValidator = {
    create : z.object({
        email : z.email("Email is required"),
        password : z.string("Password is required").min(8, "8 characters min is required"),
        confirm_password : z.string("Confirmation password is required").min(8, "8 characters min is required"),
        lastname : z.string("Lastname is required").min(2, "2 characters is required"),
        firstname : z.string("Firstname is required").min(2, "2 characters is required"),
    }).refine((data) => data.confirm_password === data.password ,{
        message : "Password don't match",
        path: ['passwordConfirm']
    }),
    
    login : z.object({
        email : z.email("Email is required"),
        password : z.string("Password is required")
    }),

    login2FA : z.object({
        user_id : z.string("User ID is required"),
        code : z.string("2FA code is required").min(6, "Authenticator code is required")
    }),

    forgotPassword : z.object({
        email : z.email("Email is required")
    }),

    resetPassword : z.object({
        token : z.string("Token is required"),
        user_id : z.string("User ID is required").or(z.int().positive()),
        newPassword : z.string("New password is required").min(8, "8 characters min is required")
    }),

    editProfil : z.object({
        email : z.email().optional(),
        lastname : z.string().min(2, "2 characters is required").optional(),
        firstname : z.string().min(2, "2 characters is required").optional(),
    })
}

module.exports = userValidator