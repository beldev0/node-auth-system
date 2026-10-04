const multer = require("multer");

const config = {
    storage : multer.memoryStorage(),
    limits : {
        fileSize :  5 * 1024 * 2024
    }
}

const uploader = multer(config)

module.exports = uploader