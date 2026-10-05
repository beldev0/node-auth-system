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
        CREATE TABLE IF NOT EXISTS login_history (
            id BIGINT GENERATED ALWAYS AS IDENTITY CONSTRAINT pk_login PRIMARY KEY,
            success BOOLEAN,
            ip_address TEXT,
            user_agent TEXT,
            user_id BIGINT CONSTRAINT fk_user REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`DROP TABLE login_history;`)
};
