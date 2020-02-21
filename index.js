
const config = require('./lib/config');
const setup = require('./lib/setup');

(async () => {
    await config.init();
    await setup.flow();

    console.log('DONE!'); // eslint-disable-line
    process.exit(0);
})();
