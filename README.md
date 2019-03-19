# Memento: The Video Memory Game

This is the repository for Memento, a game that tests your memory on a set of everyday videos. The game is accessible at memento-game.csail.mit.edu.

## Environment Variables
(see `config.js`)
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASS`
- `MEMENTO_ENV` to `test` `dev` or `prod`
    - the database name is ``memento_${MEMENTO_ENV}``

## Running
- `npm run dev` (cross-platform)
- `npm run prod` (unix only)
    - on Windows, `npm run build` and then `npm start`
- `./startforever.sh` (unix only)
    - runs the server continuously
    - **does not** trigger a build, so consider running `npm run build` first
