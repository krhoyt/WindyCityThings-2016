var bleno = require('bleno');

var COUNT_CHARACTERISTIC = '457e4a36-08ae-4198-b4d9-215711017e96';
var COUNT_NAME = 'count';
var COUNT_SERVICE = '9e10baf4-8d10-4046-a99e-dd9b3f2caf16';

var interval;
var count;

var counter = new bleno.Characteristic({
	uuid: COUNT_CHARACTERISTIC,
	properties: ['notify'],
	onSubscribe: function(maxValueSize, updateValueCallback) {
		count = 0;

		interval = setInterval(function() {
			var data = null;

			count = count + 1;

			data = new Buffer(4);
			data.writeInt32LE(count, 0);

			updateValueCallback(data);
		}, 1000);
	}
});

bleno.on('stateChange', function(state) {
	console.log('State changed: ' + state);

	if (state === 'poweredOn') {
		console.log('Start advertisting.');
		bleno.startAdvertising(COUNT_NAME, [COUNT_SERVICE]);
	} else {
		console.log('Stop advertising.');
		bleno.stopAdvertising();
	}
});

bleno.on('advertisingStart', function(error) {
	if (!error) {
		console.log('Advertising.');
		bleno.setServices([
			new bleno.PrimaryService({
				uuid: COUNT_SERVICE,
				characteristics: [counter]
			})
		]);
	} else {
		console.log(error);
	}
});
