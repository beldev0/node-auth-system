const tokenVerificationRepoFactory = (pool) => {
    return {
        async createTokenVerification({ token, user_id, expires_at }) {
            const result = await pool.query(`
                INSERT INTO verification_token(token, user_id, expires_at) VALUES ($1, $2, $3) 
                `, [token, user_id, expires_at])
            return result.rowsCount
        },

        async getVerificationToken(token, id) {
            const result = await pool.query(`
                SELECT * FROM verification_token WHERE token = $1 AND user_id = $2
                `, [token, id])
            return result.rows[0] ?? null
        }
    }
}

module.exports = tokenVerificationRepoFactory