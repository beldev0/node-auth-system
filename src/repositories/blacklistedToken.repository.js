function blacklistedTokenRepoFactory (pool) {
    return {
        async addBlacklistedToken({token, user_id, expires_at}) {            
            const result = await pool.query(`INSERT INTO blacklisted_access_token (token, user_id, expires_at) VALUES ($1, $2, $3)`, [token, user_id, expires_at])
            return result.rows[0]
        },

        async getBlacklistLine(token) {
            const result = await pool.query(`SELECT id FROM blacklisted_access_token WHERE token = $1`, [token])
            return result.rows[0] ?? null
        }   
    }
}

module.exports = blacklistedTokenRepoFactory