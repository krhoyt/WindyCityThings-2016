// Change LED state
http.onrequest( function( request, response ) {
    // JSON to table
    local data = http.jsondecode( request.body );

    // Send state to device
    device.send( "led", data.led );    
    response.send( 200, "OK" );
} );

// Send photocell value
device.on( "photocell", function( data ) {
    // Assemble URL
    local url =         
        IOT_HOST + 
        "/api/v0002/device/types/" + 
        IOT_DEVICE + 
        "/devices/" +
        IOT_ID + 
        "/events/light";
    
    // Light event
    local watson = http.post( 
        url,
        {
            "Authorization": "Basic " + http.base64encode( 
                "use-auth-token:rfE5OcyuxM5134kR+*" 
            ),
            "Content-Type": "application/json"
        },
        http.jsonencode( data ) 
    ).sendasync(
        function( response ) {
            // No value returned
            // Do nothing
            // server.log( "Event posted to Watson." );
        } 
    );  
} );

// Send button press
device.on( "button", function( data ) {
    // Assemble URL
    local url =         
        IOT_HOST + 
        "/api/v0002/device/types/" + 
        IOT_DEVICE + 
        "/devices/" +
        IOT_ID + 
        "/events/button";    
    
    // Button event
    local watson = http.post( 
        url,
        {
            "Authorization": 
                "Basic " + 
                http.base64encode( 
                    IOT_USER + ":" + IOT_TOKEN 
                ),
            "Content-Type": "application/json"
        },
        http.jsonencode( data ) 
    ).sendasync(
        function( response ) {
            // No value returned
            // Do nothing
            // server.log( "Event posted to Watson." );
        } 
    );  
} );
