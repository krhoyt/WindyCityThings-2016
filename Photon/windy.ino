#include "Constants.h"
#include "MQTT/MQTT.h"

// Debug mode
// #define SERIAL_DEBUG

// Physical button
const int PIN_BUTTON = D0;
const int PIN_LED = D1;
const int PIN_PHOTOCELL = A1;

// Connectivity
char *IOT_USERNAME = "use-token-auth";
char *TOPIC_BUTTON = "iot-2/evt/button/fmt/json";
char *TOPIC_LED = "iot-2/cmd/led/fmt/json";
char *TOPIC_PHOTOCELL = "iot-2/evt/light/fmt/json";

// Suppress multiple publishes
// Button down will continue to read high while down
// Even the quickest human effort would result in multiple high reads
// Only want to order one burger so toggle release state
bool hold = false;

// Send light values once per second
long last = 0;

// MQTT for publish/subscribe to Watson IoT
MQTT client( Constants::IOT_HOST, 1883, callback );

// Setup
void setup() {
    // Debug
    #ifdef SERIAL_DEBUG
        // Serial output
        Serial.begin( 9600 );

        // Hold until serial input
        while( !Serial.available() ) {
            Particle.process();
        }    
    #endif

    // Specify pin modes for hardware
    pinMode( PIN_PHOTOCELL, INPUT );
    pinMode( PIN_LED, OUTPUT );    
    pinMode( PIN_BUTTON, INPUT );
    
    // Connect to Watson IoT Platform
    client.connect( 
        Constants::IOT_CLIENT, 
        IOT_USERNAME, 
        Constants::IOT_PASSWORD 
    );

    // Subscribe
    // Unused for ordering
    if( client.isConnected() ) {
        // Debug
        #ifdef SERIAL_DEBUG
            Serial.println( "Connected." );
        #endif
        
        // Subscribe
        client.subscribe( TOPIC_LED );
    }
}

// Loop
void loop() {
    // Read button state
    // Will be high or low
    bool pressed = digitalRead( PIN_BUTTON );

    // Read photocell level
    // Between 0 and 4095
    int light = analogRead( PIN_PHOTOCELL );
    
    // Map to percentage value
    light = map( light, 0, 4095, 0, 100 );

    // Connect to Watson IoT Platform
    // Not worried about button otherwise
    if( client.isConnected() ) {
        // Pressed
        if( pressed && !hold ) {
            
            // Debug
            #ifdef SERIAL_DEBUG
                Serial.println( "Pressed." );
            #endif
            
            // Track as pressed
            // Supress duplicates
            hold = true;
            
            // Publish button press
            client.publish( 
                TOPIC_BUTTON, 
                "{\"pressed\": true}" 
            );            
        }
        
        // Button has been released
        if( !pressed && hold ) {
            // Debug
            #ifdef SERIAL_DEBUG
                Serial.println( "Released." );
            #endif
            
            // Track state as released
            hold = false;
        }

        // Non-blocking delay
        // Wait one second
        if( ( Time.now() - last ) >= 1 ) {
            // Update for next delay
            last = Time.now();
            
            // Debug
            #ifdef SERIAL_DEBUG
                Serial.print( "Light: " );
                Serial.println( light );
            #endif            
            
            // Publish light level
            client.publish( 
                TOPIC_PHOTOCELL, 
                "{\"light\": " + String( light ) + "}" 
            );                        
        }

        // Process MQTT stream
        client.loop();
    }
}

// Reference for handing messages
// Toggle LED
void callback( char* topic, byte* payload, unsigned int length ) {
    char p[length + 1];
    
    memcpy( p, payload, length );
    p[length] = NULL;
    
    // Bytes to String
    String message( p );
    
    // Find LED value
    // Parsing raw can be easier than making JSON
    int led = message.indexOf( ":" ) + 1;
    led = message.substring( led, led + 1 ).toInt();
    
    // Set LED
    if( led == 0 ) {
        digitalWrite( PIN_LED, LOW );
    } else if( led == 1 ) {
        digitalWrite( PIN_LED, HIGH );
    }
    
    // Debug
    #ifdef SERIAL_DEBUG    
        Serial.print( "Message: " );
        Serial.println( led );
    #endif
}
