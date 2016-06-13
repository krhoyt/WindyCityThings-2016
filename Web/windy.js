var client;

function chart( topic, index ) {
    var board = null;
    var line = null;
    var path = null;
    var step = null;

    // Debug
    console.log( 'Charting: ' + topic );
    
    // Where to draw
    board = document.querySelector( '.board[data-topic="' + topic + '"]' );
    path = board.querySelector( 'path' );

    // Movement for each data point
    // One hundred data point possible
    step = board.clientWidth / 100;
    
    // What to draw
    // This one hundred is the vertical amount
    for( var p = 0; p < boards[index].light.length; p++ ) {
        if( line == null ) {
            line = 'M 0 ' + ( 100 - boards[index].light[p] ) + ' ';
        } else {
            line = 
                line + 'L ' + 
                ( step * p ) + ' ' + 
                ( 100 - boards[index].light[p] ) + ' ';
        }
    }
    
    // Draw
    path.setAttribute( 'd', line );
}

function emphasize( topic ) {
    var board = null;
    var name = null;
    var red = null;
    
    // Get specific board element
    // Name reference for debugging
    board = document.querySelector( '.board[data-topic="' + topic + '"]' );    
    name = board.getAttribute( 'data-name' );
    
    // Debug
    console.log( 'Emphasize: ' + name );
    
    // Get inner emphasize element
    // Set to full red
    red = board.querySelector( '.emphasize' );
    red.style.opacity = 1.0;
    
    // Tween opacity to zero
    TweenMax.to( red, 1.0, {
        opacity: 0    
    } );
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
    
    if( message.destinationName.indexOf( 'button' ) >= 0 ) {
        // Debug
        console.log( 'Button on ' + boards[index].name + '.' );
        
        // Show button hit
        emphasize( boards[index].topic );
    } else if( message.destinationName.indexOf( 'light' ) >= 0) {
        // Debug
        console.log( 'Light on ' + boards[index].name + ': ' + data.light );        
        
        // Limit display to one-hundred data points
        if( boards[index].light.length == 100 ) {
            boards[index].light.splice( 0, 1 );
        }
        
        // Add new data point
        boards[index].light.push( data.light );        
        
        // Chart light values
        chart( boards[index].topic, index );
    }
    
    // Debug
    // console.log( data );    
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
