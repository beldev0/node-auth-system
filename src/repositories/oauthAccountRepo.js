const oauthAccountRepo = (pool) => {
    return {
        async createOauthAccount({ provider, provider_id, user_id }) {
            const result = await pool.query(`INSERT INTO oauth_account (provider, provider_id, user_id) VALUES ($1, $2, $3) RETURNING *`, [provider, provider_id, user_id])
            return result.rows[0]
        }
    }
}

module.exports = oauthAccountRepo