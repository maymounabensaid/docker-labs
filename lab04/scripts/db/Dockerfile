FROM postgres:16

# No password here: credentials are passed at run time (--env-file / env_file)
COPY init.sql /docker-entrypoint-initdb.d/
