# Memento: The Video Memory Game

This is the repository for Memento, a game that tests your memory on a set of everyday videos. The game is accessible at [memento-game.csail.mit.edu](https://memento-game.csail.mit.edu).

## Dependencies
This is a JavaScript project, so you need to have `node` and `npm` installed, and the first time you clone the repo, you need to run `npm i` to install dependencies.

You need to get the `clean_10k.json` dataset file and put it in `task_data/video_datasets`. If you do not have this file and want to test the app, you can edit `api/config.js` and change `clean_10k` to `videomem_300`.

## Environment Variables
The server expects the following environment variables to be set (see `api/config.js`).
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASS`
- `MEMENTO_ENV` to `test` `dev` or `prod`
    - set to `test` automatically when running the tests
    - the database name is ``memento_${MEMENTO_ENV}``
    - used to pick a config from `api/config.js`
- `USE_SHORT_SEQUENCE` (optional): if `true`, the video stream will only have 4 videos (for debugging)

## Commands
- `npm run dev` run the app; webpack compiles the code every time you save a file
- `npm run prod` run the app; webpack compiles the code once at the start
- `npm run test` run the tests; **warning: this will wipe the database (default: memento_test)**
- `npm run lint` check for errors & browser compatability
    - `npm run lint-js` lint JavaScript only
    - `npm run lint-css` lint CSS only
- `npm run build` compile the code but don't start the server
- `npm start` start the server but don't compile the code

## Project Structure
The `api` directory contains the code for the backend. The file `bin/www` contains JavaScript code to start the server. The `test` directory contains tests for the server. The server serves all files in the `public` directory. Webpack is used for frontend JavaScript only: the frontend code lives in `ui-js-src`, and webpack compiles it to `public/js/bundle.js`. This allows us to use imports and other modern JS features regardless of browser support, and the code minification makes it harder to cheat. All other frontend code is in the `public` directory and is served as-is. Note that the `public/lib` directory contains some JavaScript: Semantic UI expects a global jQuery import.

## Using the Production Server
The production server is located in the directory `/data/vision/oliva/scratch/memento-mem-game` on `wednesday.csail.mit.edu`.
The first time you do this, add `export FOREVER_ROOT=/data/vision/oliva/scratch/memento-mem-game/.forever` to your `.bashrc`.
1. `npx forever stop memento-prod` stop the server
2. `git pull` get the changes
3. `npm i` install any new dependencies
4. `./startforever.sh` build and start the server

## Browser Support
After making a change, do `npm run lint` to check browser compatability. If you get a JS warning, you need to install a polyfill, import it in `ui-js-src/polyfills.js`, and list it in `ui-js-src/.eslintrc.json`. If you get a CSS warning, figure out if it matters (it warns if something is partially supported, but often the part you are using is supported; other times, the style is purely cosmetic). If it does matter, either use a different style or add a polyfill. Either way, add a `stylelint-disable` comment with an explanation. If you add a dependency, run a test in IE 11 to make sure nothing broke, as the linter does not look at third-party code.

**Note: use a production build when testing browser support.** Development builds do not transform syntax.
