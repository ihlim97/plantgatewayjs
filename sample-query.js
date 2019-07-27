'use strict';

const miflora = require('miflora');

const discoverOptions = {
	duration: 5000
};

(async function () {
	console.log('> scanning for a max of %s seconds', discoverOptions.duration / 1000);
	const devices = await miflora.discover(discoverOptions);
	const device = devices[0];
	if (device) {
		let d = await device.query();
		console.log(d)
	} else {
		console.log('not found');
	}
})();
