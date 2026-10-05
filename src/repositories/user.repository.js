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
                SELECT u.email, u.profil, u.lastname, u.firstname, u.created_at, u.disabled_at, u.email_verified_at, count(rf.id) nbre_session
                FROM users u
                LEFT JOIN refresh_token rf
                ON u.id = rf.user_id
                WHERE u.email = $1 AND rf.revoked_at IS NULL AND rf.expires_at > NOW()
                GROUP BY u.email, u.profil, u.lastname, u.firstname, u.created_at, u.disabled_at, u.email_verified_at;
                `, [email]);
            return result.rows[0] ?? null
        },

        async getUserById(id) {
            const result = await pool.query(`
                SELECT * FROM users WHERE id = $1
                `, [id]);
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