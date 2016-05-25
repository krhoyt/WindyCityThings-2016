// MQTT for Watson IoT
// JSON file for configuration
// Path for file location on device
var jsonfile = require( 'jsonfile' );
var mqtt = require( 'mqtt' );
var path = require( 'path' );

// Load external authentication
var config = jsonfile.readFileSync( path.join( __dirname, 'config.json' ) );

// Connect to Watson IoT
var client = mqtt.connect( config.host, {
	clientId: config.client,
	password: config.password,
	username: 'use-token-auth'
} );
var count = 0;
var interval;

// Connected
client.on( 'connect', function() {
	console.log( 'Connected.' );
	
	// Subscribe to LED commands
	client.subscribe( 'iot-2/cmd/led/fmt/json', function( err, granted ) {
		console.log( 'Subscribed.' );
	} );
	
	// Start counting
	// Once per second
	interval = setInterval( function() {
		count = count + 1;
		
		// Publish value to Watson IoT
		client.publish( 'iot-2/evt/count/fmt/json', JSON.stringify( {
			count: count
		} ) );
		
		console.log( 'Count: ' + count );
	}, 1000 );
} );

// Handle messages
// LED command
client.on( 'message', function( topic, message, packet ) {
	var data = null;
	
	// Object from JSON
	data = JSON.parse( message );
	
	console.log( 'Message: ' + data.led );
} );
