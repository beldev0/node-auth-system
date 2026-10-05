const loginHistoryRepoFactory = (pool) => {
    return {
        async createHistory({ip_address, user_agent, success, user_id }) {
            const result = await pool.query(`
                INSERT INTO login_history (success, ip_address, user_agent, user_id) VALUES ($1, $2, $3, $4)
                `, [success, ip_address, user_agent, user_id])
            
            return result.rows[0]
        },

        async getLoginHistory() {
            const result = await pool.query(`
                SELECT lh.id, lh.ip_address, lh.user_agent, u.firstname, u.lastname, u.email
                FROM login_history lh
                INNER JOIN users u
                ON lh.user_id = users.id
                `)
            return result.rows
        }
    }
}

module.exports = loginHistoryRepoFactory