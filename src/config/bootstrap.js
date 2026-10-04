const paths = require('./../utils/pathHelpers.js')
const fsp = require('fs/promises')
async function createPublicsFolder() {
    const PUBLIC_DIR = paths.getPublicDirPath()
    const UPLOAD_DIR = paths.getUploadDirPath()

    await fsp.mkdir(PUBLIC_DIR, { recursive: true })
    console.log("PUBLIC DIR created....");
    await fsp.mkdir(UPLOAD_DIR, { recursive: true })
    console.log("UPLOAD DIR created....");
}

createPublicsFolder()

module.exports = { createPublicsFolder }