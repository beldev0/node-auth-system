function userRepoFactory(pool) {
    return {
        async createUser({ email, lastname, firstname, password, profil, email_verified_at=null }) {
            const result = await pool.query(`
                INSERT INTO users (email, lastname, firstname, password, profil, email_verified_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, lastname, firstname, email, created_at, profil, email_verified_at, disabled_at
                `, [email, lastname, firstname, password, profil ?? 'https://www.pinterest.com/pin/912753049464898175/', email_verified_at])

            return result.rows[0]
        },

        async getUserByEmail(email) {
            const result = await pool.query(`
                SELECT  u.email,
                        u.profil,
                        u.lastname, 
                        u.id,
                        u.password,
                        u.firstname, 
                        u.created_at, 
                        u.disabled_at, 
                        u.email_verified_at, 
                        count(rf.id) nbre_session
                FROM users u
                LEFT JOIN refresh_token rf
                ON u.id = rf.user_id
                AND rf.revoked_at IS NULL AND rf.expires_at > NOW()
                WHERE u.email = $1 
                GROUP BY u.email,
                         u.profil, 
                         u.lastname, 
                         u.firstname, 
                         u.created_at, 
                         u.disabled_at, 
                         u.email_verified_at, 
                         u.password,
                         u.id;
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
        },
        
        async updatePassword(user_id, password) {
            const result = await pool.query(`
                UPDATE users SET password = $1 WHERE id = $2
                `, [password, user_id])
            return result.rowsCount
        },

        async updateProfil({user_id, email, lastname, firstname}) {
            const result = await pool.query(`
                UPDATE users
                SET email = COALESCE($1, email),
                    lastname = COALESCE($2, lastname),
                    firstname = COALESCE($3, firstname)
                WHERE id = $4 RETURNING *
                `, [email ?? null, lastname ?? null, firstname ?? null, user_id])
            return result.rows[0]
        }
    }
}

module.exports = userRepoFactory