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
        CREATE TABLE IF NOT EXISTS users (
            id BIGINT GENERATED ALWAYS AS IDENTITY CONSTRAINT pk_user PRIMARY KEY,
            email TEXT NOT NULL CONSTRAINT uq_user_email UNIQUE,
            password TEXT NOT NULL,
            firstname TEXT NOT NULL, 
            lastname TEXT NOT NULL,
            email_verified_at TIMESTAMPTZ,
            profil TEXT DEFAULT 'https://www.pinterest.com/pin/912753049464898175/',
            two_factor_secret TEXT,
            two_factor_enabled_at TIMESTAMPTZ,
            disabled_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ
        );
    `)
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.sql(`DROP TABLE users;`)
};
