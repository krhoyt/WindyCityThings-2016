// MQTT for Watson IoT
// JSON file for configuration
// Path for file location on device
// Tessel for hardware interaction
var jsonfile = require( 'jsonfile' );
var mqtt = require( 'mqtt' );
var path = require( 'path' );
var tessel = require( 'tessel' );

var bounce;			// Interval for button
var bright;			// Interval for photocell
var button;			// Button pin
var client;			// Watson IoT client
var config;			// Authentication
var interval;		// Interval for publish
var light;			// Photocell reading
var led;			// LED state
var photocell;		// Photocell pin
var pressed;		// Button press

// Load external authentication
config = jsonfile.readFileSync( path.join( __dirname, 'config.json' ) );

// Connect to Watson IoT
client = mqtt.connect( config.host, {
	clientId: config.client,
	password: config.password,
	username: 'use-token-auth'
} );

// LED on pin 1
// Treat as digital output
// Turn off initially
led = tessel.port.B.pin[1];
led.output( 0 );

// Photocell on pin 3
// Treat as analog input
photocell = tessel.port.B.pin[3];

bright = setInterval( function() {
	photocell.analogRead( function( err, value ) {
		light = value;
	} );
}, 100 );

// Work with button on pin 5
button = tessel.port.B.pin[5];
pressed = false;

// Monitor button pin
bounce = setInterval( function() {
	// Asynchromouns button reading
	// Digital signal (on or off)
	button.read( function( err, value ) {
		// Up (off)
		if( value === 0 ) {
			pressed = false;
		// Down (on)
		} else if( value === 1 ) {
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
	} );	
}, 100 );

// Connected
// Subscribe to LED commands
// Start sending photocell events
client.on( 'connect', function() {
	console.log( 'Connected.' );
	
	// Subscribe to LED commands
	client.subscribe( 'iot-2/cmd/led/fmt/json', function( err, granted ) {
		console.log( 'Subscribed.' );
	} );
	
	// Send light value to clients
	// Decoupled from reading	
	interval = setInterval( function() {
		client.publish( 'iot-2/evt/light/fmt/json', JSON.stringify( {
			light: light
		} ) );

		console.log( 'Light: ' + light );
	}, 1000 );
} );

// Handle messages
// LED command
client.on( 'message', function( topic, message, packet ) {
	var data = null;
	
	// Object from JSON
	data = JSON.parse( message );
	
	// Set LED state
	led.output( data.led );
	
	console.log( 'Message: ' + data.led );
} );
