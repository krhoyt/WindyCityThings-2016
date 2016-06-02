// MQTT for Watson IoT
// JSON file for configuration
// Path for file location on device
// MRAA for hardware interaction
var jsonfile = require( 'jsonfile' );
var mraa = require( 'mraa' );
var mqtt = require( 'mqtt' );
var path = require( 'path' );

var bounce;			// Interval for button
var button;			// Button pin
var client;			// Watson IoT client
var config;			// Authentication
var led;			// LED pin
var pressed;		// Button press

// Load external authentication
config = jsonfile.readFileSync( path.join( __dirname, 'config.json' ) );

// Connect to Watson IoT
client = mqtt.connect( config.host, {
	clientId: config.client,
    password: config.password,
    username: 'use-token-auth'
} );

// LED
// GP14 == 36 on SparkFun GPIO Block
// Treat as digital output
// Turn off initially
led = new mraa.Gpio( 36 );
led.dir( mraa.DIR_OUT );
led.write( 0 );

// Button
// 1k resistor for pull down
// GP13 == 14 on SparkFun GPIO Block
button = new mraa.Gpio( 14 );
button.dir( mraa.DIR_IN );
pressed = false;

// Monitor button pin
bounce = setInterval( function() {
	var value = null;
	
	// Read pin
	// Digital signal (on or off)
	value = button.read();

	// Up (off)
	if( value === 0 ) {
		pressed = false;
	// Down (on)
	} else if ( value === 1 ) {
		// Only fire press once
		if( !pressed ) {
			pressed = true;
			
			// Publish value to Watson IoT
			client.publish( 'iot-2/evt/button/fmt/json', JSON.stringify( {
				pressed: pressed
			} ) );
			
			console.log( 'Pressed.' );
		}
	}
}, 100 );

// Connected
// Subscribe to LED commands
client.on( 'connect', function() {
	console.log( 'Connected.' );

	// Subscribe to LED commands
	client.subscribe( 'iot-2/cmd/led/fmt/json', function( err, granted ) {
		console.log( 'Subscribed.' );
	} );
} );

// Handle messages
// LED command
client.on( 'message', function( topic, message, packet ) {
	var data = null;

	// Object from JSON
	data = JSON.parse( message );

	// Set LED state
	led.write( data.led );

	console.log( 'Message: ' + data.led );
} );
