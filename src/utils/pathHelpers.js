const path = require('path')


function getPublicDirPath() {
   return path.join(process.cwd(), 'public')
}

function getUploadDirPath() {
    const PUBLIC_DIR = getPublicDirPath()
    return path.join(PUBLIC_DIR, 'uploads')
}

module.exports = {
    getPublicDirPath,
    getUploadDirPath
}