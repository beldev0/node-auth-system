const { z } = require('zod')

const userValidator = {
    create : z.object({
        email : z.email(),
        password : z.string().min(8, "8 characters min is required"),
        confirm_password : z.string().min(8, "8 characters min is required"),
        lastname : z.string().min(2, "2 characters is required"),
        firstname : z.string().min(2, "2 characters is required"),
    }).refine((data) => data.confirm_password === data.password ,{
        message : "Password don't match",
        path: ['passwordConfirm']
    }),
    
    update : z.object({
        email : z.email("Email is required"),
        lastname : z.string().min(2, "2 characters is required"),
        firstname : z.string().min(2, "2 characters is required"),
    }),

    login : z.object({
        email : z.email(),
        password : z.string("Password is required")
    })
}

module.exports = userValidator