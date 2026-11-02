SELECT 'CREATE DATABASE auth_sys_db' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='auth_sys_db')\gexec