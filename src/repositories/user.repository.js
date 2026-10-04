function userRepoFactory(pool) {
    return {
        async createUser({ email, lastname, firstname, password, profil }) {
            const result = await pool.query(`
                INSERT INTO users (email, lastname, firstname, password, profil) VALUES ($1, $2, $3, $4, $5) RETURNING id, lastname, firstname, email, created_at, profil, email_verified_at, disabled_at
                `, [email, lastname, firstname, password, profil ?? 'https://www.pinterest.com/pin/912753049464898175/'])
            
            return result.rows[0]
        },

        async getUserByEmail(email) {
            const result = await pool.query(`
                SELECT * FROM users WHERE email = $1
                `, [email]);
            return result.rows[0] ?? null
        },

        async verifyUser(id) {
            const result = await pool.query(`
                UPDATE users SET email_verified_at = NOW() WHERE id = $1
                `, [id])
            return result.rowsCount
        }
    }
}

module.exports = userRepoFactory