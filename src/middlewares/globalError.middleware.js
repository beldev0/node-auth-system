const multer = require("multer");

const globalErrorMiddleware = (err, req, res, next) => {
    if (err) {
        console.log(err);
        if (err.name && err.name == "Custom Error") {            
            return res.status(err.statusCode).json({"success":false, errors:err.errors})
        }

        if (err instanceof multer.MulterError) {
            if(err.code == 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({"success":false, errors:[`Unexpected field '${err.field}'`]})
            }
            
            if (err.code == 'LIMIT_FILE_SIZE') {
                return res.status(413).json({"success":false, errors:["Profil image too large. 5MB is max"]})
            }
        }

        if (err.constraint) {
            switch (err.constraint) {
                case 'pk_user' : 
                    return res.status(400).json({"success":false, errors: "Invalid user reference"})
                    break;
                case 'uq_user_email' :
                    return res.status(409).json({"success":false, errors:"Email is already taken"})
                    break;
                case 'fk_user_id' :
                    return res.status(400).json({"success":false, errors: "Invalid user reference"})
                    break;
                default : 
                    return res.status(400).json({"success":false, errors:"Missing required field"})
            }
        }
        
        return res.status(500).json({"success":false, errors:"Unexpected errors occurs"})
    }
}

module.exports = globalErrorMiddleware