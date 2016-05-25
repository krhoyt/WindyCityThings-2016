var client;
var led;

// Connected to broker
// Subscribe for count topic
function doClientConnect( context ) {
    console.log( 'Connected.' );
	client.subscribe( 'iot-2/type/Tessel/id/IBM/evt/count/fmt/json' );
}    
    
// Unable to connect
function doClientFailure( context, code, message ) {
    console.log( 'Connection fail.' );
}    

// Message arrived
function doCountArrived( message ) {
	var data = null;
	var element = null;
	
	// Parse
	data = JSON.parse( message.payloadString );
	console.log( data );
}	

// Button to toggle LED clicked
// Send event to device
function doToggleClick() {
	var message = null;
	
	// Toggle LED state
	led = !led;
	
	// Build message
	message = new Paho.MQTT.Message( JSON.stringify( {
		led: led
	} ) );
	message.destinationName = 'iot-2/type/Tessel/id/IBM/cmd/led/fmt/json';
	
	// Send
	client.send( message );	
}

function doWindowLoad() {
	var button = null;
	
	// Initialize LED state
	led = false;
	
	// Let the user change the LED state
	button = document.querySelector( 'button' );
	button.addEventListener( 'click', doToggleClick );
	
	// Instantiate client
    try {
        client = new Paho.MQTT.Client(
            IOT_HOST, 
            IOT_PORT, 
            IOT_CLIENT + Math.round( Math.random() * 1000 )
        );
		client.onMessageArrived = doCountArrived;
    } catch( error ) {
        console.log( 'Error: ' + error );
    }    
    
	// Connect to broker
    client.connect( {
        userName: IOT_USER,
        password: IOT_PASSWORD,
        onSuccess: doClientConnect,
        onFailure: doClientFailure
    } );	
}

window.addEventListener( 'load', doWindowLoad );
