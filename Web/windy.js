var client;

function chart( topic, value ) {
    var board = null;
    var path = null;

    // Debug
    console.log( 'Charting: ' + value );
    
    board = document.querySelector( '.board[data-topic="' + topic + '"]' );
    path = board.querySelector( 'path' );
}

function emphasize( topic ) {
    var board = null;
    var name = null;
    
    board = document.querySelector( '.board[data-topic="' + topic + '"]' );    
    name = board.getAttribute( 'data-name' );
    
    // Debug
    console.log( 'Emphasize: ' + name )
}

// Button to toggle LED clicked
// Send event to device
function doBoardClick() {
    var led = null;
    var message = null;
    var name = null;
    var topic = null;
    
    // Get LED state
    led = parseInt( this.getAttribute( 'data-led' ) );
    
	// Toggle LED state
	led = led === 0 ? 1 : 0;
    
    // Persist LED state
    this.setAttribute( 'data-led', led );
	
    // Get topic
    topic = this.getAttribute( 'data-topic' );    
    
    // Get board name
    name = this.getAttribute( 'data-name' );

    // Debug
    console.log( 'Setting ' + name + ' to: ' + led );    
    
	// Build message
	message = new Paho.MQTT.Message( JSON.stringify( {
		led: led
	} ) );
	message.destinationName = 'iot-2/type/' + topic + '/id/IBM/cmd/led/fmt/json';
	
	// Send
	client.send( message );	    
}

// Connected to broker
// Subscribe for count topic
function doClientConnect( context ) {
    // Debug
    console.log( 'Connected.' );
    
    // Subscribe to button and light events
	client.subscribe( 'iot-2/type/+/id/IBM/evt/light/fmt/json' );
	client.subscribe( 'iot-2/type/+/id/IBM/evt/button/fmt/json' );	
}    
    
// Unable to connect
function doClientFailure( context, code, message ) {
    // Debug
    console.log( 'Connection failed.' );
}    

// Message arrived
function doMessageArrived( message ) {
	var data = null;
    var index = null;

	// Parse
	data = JSON.parse( message.payloadString );

    // Find board
    for( var b = 0; b < boards.length; b++ ) {
        if( message.destinationName.indexOf( boards[b].topic ) >= 0 ) {
            index = b;
            break;
        }
    }    
    
    if( message.destinationName.indexOf( 'button' ) ) {
        // Debug
        console.log( 'Button on ' + boards[index].name + '.' );
        
        // Show button hit
        emphasize( board.topic );
    } else if( message.destinationName.indexOf( 'light' ) ) {
        // Debug
        console.log( 'Light on ' + boards[index].name + ': ' + data.light );        
        
        // Chart light values
        chart( boards[index].topic, data.light );
    }
    
    // Debug
    console.log( data );    
}	

function doWindowLoad() {	
    var board = null;
    var panels = null;
    var template = null;
    
    // Debug
    console.log( 'Loaded.' );
    
	// Instantiate client
    try {
        client = new Paho.MQTT.Client(
            IOT_HOST, 
            IOT_PORT, 
            IOT_CLIENT + Math.round( Math.random() * 1000 )
        );
		client.onMessageArrived = doMessageArrived;
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
    
    // Get panel holder and template
    panels = document.querySelector( '.panels' );
    template = document.querySelector( '.board.template' );
    
    // Build panels
    for( var b = 0; b < boards.length; b++ ) {
        // Populate data attributes per board
        board = template.cloneNode( true );
        board.classList.remove( 'template' );
        board.style.backgroundImage = 'url( ' + boards[b].image + ' )';
        board.children[1].innerHTML = boards[b].topic;
        board.setAttribute( 'data-name', boards[b].topic );
        board.setAttribute( 'data-topic', boards[b].topic );        
        board.addEventListener( 'click', doBoardClick );
        
        // Add to holder
        panels.appendChild( board );
    }
}

// Go
window.addEventListener( 'load', doWindowLoad );
