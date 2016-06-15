// MQTT for Watson IoT
// JSON file for configuration
// Path for file location on device
// MRAA for hardware interaction
// Bleno for Bluetooth Smart
// Util for inheritance
var bleno = require( 'bleno' );
var jsonfile = require( 'jsonfile' );
var mraa = require( 'mraa' );
var mqtt = require( 'mqtt' );
var path = require( 'path' );
var util = require( 'util' );

/* Enable Bluetooth */
/*
 * rfkill unblock bluetooth
 * killall bluetoothd
 * hciconfig hci0 up
*/

var BUTTON_UUID = 'aadae336-7ebb-4381-bdad-801627309d5e';
var LED_UUID = '44cfb349-9b03-49ea-a2cf-af34efe48c0b';
var LIGHT_UUID = '457e4a36-08ae-4198-b4d9-215711017e96';
var WINDY_NAME = 'Windy';
var WINDY_UUID = '9e10baf4-8d10-4046-a99e-dd9b3f2caf16';

var bounce;			// Interval for button
var bright;			// Interval for photocell
var button;			// Button pin
var buttoning;		// Button characteristic
var client;			// Watson IoT client
var command;		// I2C commands
var config;			// Authentication
var interval; 		// Interval for publish
var led;			// LED pin
var leading;		// LED characteristic
var light; 			// Photocell reading
var lightning;		// Light characteristic
var pressed;		// Button press

// Button characteristic (BLE)
var ButtonCharacteristic = function() {
	bleno.Characteristic.call( this,  {
		uuid: BUTTON_UUID,
		properties: ['notify']
	} );
	
	this.onPressed = null;
};

// Inherit from Characteristic
util.inherits( ButtonCharacteristic, bleno.Characteristic );

// Listen for subscribe
ButtonCharacteristic.prototype.onSubscribe = function( maxValueSize, updateValueCallback ) {
	this.onPressed = updateValueCallback;
};

// Called to notify of button press
ButtonCharacteristic.prototype.pressed = function( value ) {
	var data = null;
	
	// Subscribed clilent
	if( this.onPressed ) {
		data = new Buffer( 1 );
		data.writeUInt8( value, 0 );
		
		this.onPressed( data );
	}
};

// Instantiate
buttoning = new ButtonCharacteristic();

// LED characteristic (BLE)
var LedCharacteristic = function() {
	bleno.Characteristic.call( this, {
		uuid: LED_UUID,
		properties: ['write']
	} );
};

// Inherit from Characteristic
util.inherits( LedCharacteristic, bleno.Characteristic );

// Listen for write from client
LedCharacteristic.prototype.onWriteRequest = function( data, offset, withoutResponse, callback ) {
	var value = data;
	
	// No data to process
	if( !value ) {
		callback( this.RESULT_SUCCESS );
		return;
	}
	
	// LED pin defined
	if( led ) {
		// Get value written from client
		// Set LED pin state
		value = data.readUInt8( 0 );
		led.write( value );
		
		console.log( 'Write: ' + value );		
	}
	
	callback( this.RESULT_SUCCESS );
};

// Instantiate
leading = new LedCharacteristic();

// Light characteristic (BLE)
var LightCharacteristic = function() {
	bleno.Characteristic.call( this,  {
		uuid: LIGHT_UUID,
		properties: ['notify']
	} );
	
	this.onBrightness = null;
};

// Inherit from Characteristic
util.inherits( LightCharacteristic, bleno.Characteristic );

// Listen for subscribe
LightCharacteristic.prototype.onSubscribe = function( maxValueSize, updateValueCallback ) {
	this.onBrightness = updateValueCallback;
};

// Called to notify of light level change
LightCharacteristic.prototype.brightness = function( value ) {
	var data = null;
	
	// Subscribed client
	if( this.onBrightness ) {
		data = new Buffer( 4 );
		data.writeInt32LE( value, 0 );
		
		this.onBrightness( data );
	}
};

// Instantiate
lightning = new LightCharacteristic();

// Bluetooth
bleno.on( 'stateChange', function( state ) {
	console.log( 'State changed: ' + state );
	
	// Spin up BLE
	if( state == 'poweredOn' ) {
		console.log( 'Start advertising.' );
		bleno.startAdvertising( WINDY_NAME, [WINDY_UUID] )
	} else{
		console.log( 'Stop advertising.' );
		bleno.stopAdvertising();
	}
} );

// BLE started
// Start advertising
bleno.on( 'advertisingStart', function( error ) {
	if( !error ) {
		console.log( 'Advertising.' );
		
		// Service
		// Characteristics
		bleno.setServices( [
			new bleno.PrimaryService( {
				uuid: WINDY_UUID,
				characteristics: [lightning, buttoning, leading]
			} )
		] );
	} else {
		console.log( error );
	}
} );

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
			
			// Notify Bluetooth client
			buttoning.pressed( pressed ? 1 : 0 );
			
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
		var mapped = null;
		
		mapped = map( light, 0, 2047, 0, 100 );
		mapped = Math.round( mapped );
		
		// MQTT network clients
		client.publish( 'iot-2/evt/light/fmt/json', JSON.stringify( {
			light: mapped
		} ) );

		// Bluetooth clients
		// Expecting to write whole number
		lightning.brightness( mapped );

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
	led.write( parseInt( data.value ) );

	console.log( 'Message: ' + parseInt( data.value ) );
} );

// Linear transform
// Similar to Arduino map function
function map( x, in_min, in_max, out_min, out_max ) {
	return ( x - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min;
}
