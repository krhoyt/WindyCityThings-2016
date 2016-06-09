// MQTT for Watson IoT
// JSON file for configuration
// Path for file location on device
// MRAA for hardware interaction
var jsonfile = require( 'jsonfile' );
var mraa = require( 'mraa' );
var mqtt = require( 'mqtt' );
var path = require( 'path' );

var bounce;			// Interval for button
var bright;			// Interval for photocell
var button;			// Button pin
var client;			// Watson IoT client
var command;		// I2C commands
var config;			// Authentication
var interval; 		// Interval for publish
var led;			// LED pin
var light; 			// Photocell reading
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

// Photocell
// Gets treated as I2C on ADC board
// 330 resistor seems to range levels best
command = parseInt( '1000001101000100', 2 );
photocell = new mraa.I2c( 1 );
photocell.address( 0x48 );

bright = setInterval( function() {
	var data = null;
	var result = null;
	
	// Get reading
	photocell.writeWordReg( 0x01, command );
	data = photocell.readWordReg( 0 );
	
	// Process signal
	result = 0;
	result += ( data & 0XF000 ) >> 12; 
	result += ( data & 0X00F0 ) << 4;
	result += ( data & 0X000F ) << 4;
			
	if( result > 0x7FF ) {
		result = -1 * ( ( 0x7FF * 2 + 2 ) + ( ~result ) )		
	}

	light = result;
}, 100 );

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
	
	// Send light value to clients
	// Decoupled from reading	
	interval = setInterval( function() {
		client.publish( 'iot-2/evt/light/fmt/json', JSON.stringify( {
			light: map( light, 0, 2047, 0, 100 )
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
	led.write( data.led );

	console.log( 'Message: ' + data.led );
} );

// Linear transform
// Similar to Arduino map function
function map( x, in_min, in_max, out_min, out_max ) {
	return ( x - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min;
}
