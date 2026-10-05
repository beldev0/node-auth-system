/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS refresh_token (
            id BIGINT GENERATED ALWAYS AS IDENTITY CONSTRAINT pk_key PRIMARY KEY,
            token TEXT NOT NULL,
            user_agent TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            user_id BIGINT CONSTRAINT fk_user_id REFERENCES users(id)
        )
    `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`DROP TABLE refresh_token;`)
};
