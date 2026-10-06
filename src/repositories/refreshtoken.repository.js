function refreshTokenRepoFactory (pool) {
    return {
        async createRefreshToken({ token, user_agent, ip_address, expires_at, user_id }) {
            const result = await pool.query(`
                INSERT INTO refresh_token (token, user_agent, ip_address, expires_at, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *
                `, [token, user_agent, ip_address, expires_at, user_id])
            return result.rows[0]
        },

        async revokeRefreshToken(token) {
            const result = await pool.query(`UPDATE refresh_token SET revoked_at = NOW() WHERE token = $1 RETURNING *`, [token])
            return result.rows[0]
        },

        async getRefreshToken(token) {
            const result = await pool.query(`
                SELECT revoked_at, expires_at, user_id FROM refresh_token WHERE token = $1
                `, [token])
            return result.rows[0]
        }
    }
}

module.exports = refreshTokenRepoFactory