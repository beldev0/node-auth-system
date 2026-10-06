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
        CREATE TABLE IF NOT EXISTS password_reset_token (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            token TEXT NOT NULL,
            user_id BIGINT NOT NULL CONSTRAINT fk_user_id REFERENCES users(id)
            ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL
    );
    `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`DROP TABLE password_reset_token;`)
};
