// MQTT for Watson IoT
// JSON file for configuration
// Path for file location on device
// Tessel for hardware interaction
var jsonfile = require( 'jsonfile' );
var mqtt = require( 'mqtt' );
var path = require( 'path' );
var tessel = require( 'tessel' );

// Application variables
var bounce;
var button;
var client;
var config;
var interval;
var led;
var reading;
var photocell;
var pressed;

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

// Work with button on pin 5
button = tessel.port.B.pin[5];
reading = false;
pressed = false;

// Monitor button pin
bounce = setInterval( function() {
	// Only read if not already reading
	if( !reading ) {
		// Going to read
		reading = true;
		
		// Asynchromouns button reading
		button.read( function( err, value ) {
			// Up
			if( value === 0 ) {
				pressed = false;
			// Down
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
			
			// Finished reading
			reading = false;
		} );
	}
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
		// Read pin value
		// Between 0 (dark) and 3.3 (light)
		photocell.analogRead( function( err, value ) {
			// Publish value to Watson IoT
			client.publish( 'iot-2/evt/light/fmt/json', JSON.stringify( {
				light: value
			} ) );
		
			console.log( 'Light: ' + value );					
		} );		
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
