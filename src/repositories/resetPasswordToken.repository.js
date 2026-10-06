const resetPasswordToken = ( pool ) => {
    return {
        async createResetToken({ token, user_id, expires_at }) {
            const result = await pool.query(`
                INSERT INTO password_reset_token (token, user_id, expires_at ) VALUES ($1, $2, $3)
                `, [token, user_id, expires_at])
            return result.rows[0]
        },

        async getResetToken({user_id, token}) {
            const result = await pool.query(`
                SELECT * FROM password_reset_token WHERE user_id = $1 AND token = $2
                `, [user_id, token])
            return result.rows[0] ?? null
        }
    }
}

module.exports = resetPasswordToken