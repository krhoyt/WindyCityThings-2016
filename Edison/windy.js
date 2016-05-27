var jsonfile = require( 'jsonfile' );
var mraa = require( 'mraa' );
var mqtt = require( 'mqtt' );
var path = require( 'path' );

var client;
var config;
var led;

config = jsonfile.readFileSync( path.join( __dirname, 'config.json' ) );

client = mqtt.connect( config.host, {
    clientId: config.client,
    password: config.password,
    username: 'use-token-auth'
  }
);

led = new mraa.Gpio( 13 );
led.dir( mraa.DIR_OUT );

client.on( 'connect', function() {
  console.log( 'Connected.' );

  client.subscribe( 'iot-2/cmd/led/fmt/json', function( err, granted ) {
    console.log( 'Subscribed.' );
  } );
} );

client.on( 'message', function( topic, message, packet ) {
  var data = null;

  data = JSON.parse( message );

  led.write( data.led );

  console.log( 'Message: ' + data.led );
} );
