// LED
// Digital output on pin 2
// Initially off (0)
led <- hardware.pin2;
led.configure( DIGITAL_OUT, 0 );

// Message from agent (server)
// Set LED state
agent.on( "led", function( value ) {
    led.write( value );    
} );

// Photocell
// Analog input on pin 1
photocell <- hardware.pin1;
photocell.configure( ANALOG_IN );

// Linear transform
// Similar to Arduino map function
function map( x, in_min, in_max, out_min, out_max ) {
	return ( x - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min;
}

// Watch light value
function light() {
    // Getting analog value
    // As float for range mapping
    local value = photocell.read().tofloat();
    
    // Map from Imp precision (0 - 65535)
    // Map to percentage (0 - 100)
    value = map( value, 0, 65535, 0, 100 );
    
    // Send agent latest value
    // Agent will send to Watson IoT
    agent.send( "photocell", {
        "light": value    
    } );

    server.log( "Light: " + value );

    // Do this again in one second
    imp.wakeup( 1.0, light );
}

// Monitor photocell
light();

// Button
local pressed = false;

// Digital input on pin 7
// Callback on state change
// Sampling rate of 100ms
button <- hardware.pin7;
button.configure( DIGITAL_IN, function() {
    // Read button state
    local value = button.read();

    // Up (off)
    if( value == 0 ) {
        pressed = false;
    // Down (on)
    } else if( value == 1 ) {
        // Only fire press once
        if( !pressed ) {
            pressed = true;
            
            // Tell agent about state change
            agent.send( "button", {
                "pressed": pressed    
            } );
            
            server.log( "Pressed." );
        }
    }
} );
