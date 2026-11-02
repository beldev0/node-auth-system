const { success } = require("zod")

const adminControllerRepo = (adminService) => {
    return {
        async listSessions(req, res, next) {
            try {
                const sessions = await adminService.listSessions()
                return res.json({success : true, data:sessions})
            } catch (err) { next(err) }
        },

        async getLoginHistory(req, res, next) {
            try {
                const histories = await adminService.getLoginHistory()
                return res.json({success:true, data:histories})
            } catch (err) { next(err) }
        },

        async disableAccount(req, res, next) {
            if (!req.body.id) {
                return res.json({success:false, errros:["User ID required"]})
            }
            try {   
                await adminService.disableAccount(req.body.id)
                return res.json({success:true, message:"Account successufully disabled"})
            } catch (err) {next(err)}
        }
    }
}

module.exports = adminControllerRepo