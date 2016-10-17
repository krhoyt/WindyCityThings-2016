// Generic ESP8266 Module
// Flash Mode = QIO
// Flash Frequency = 40MHz
// CPU Frequency = 80MHz
// Flash Size = 4M 1M SPIFFS
// Reset Method = nodemcu
// Upload Speed = 115200

#include "Constants.h"
#include <ESP8266WiFi.h>
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient client( espClient );
long lastMsg = 0;
char msg[50];
int value = 0;

void callback( char* topic, byte* payload, unsigned int length ) {
  Serial.print( "Message arrived (");
  Serial.print( topic );
  Serial.print( "): " );
  
  for( int i = 0; i < length; i++ ) {
    Serial.print( ( char )payload[i] );
  }
  
  Serial.println();

  if( ( char )payload[0] == '1' ) {
    digitalWrite( BUILTIN_LED, LOW );
  } else {
    digitalWrite( BUILTIN_LED, HIGH );
  }
}

void setup_wifi() {
  delay( 10 );

  Serial.print( "Connecting to: " );
  Serial.print( Constants:WIFI_SSID );

  WiFi.begin( Constants::WIFI_SSID, Constants::WIFI_PASSWORD );

  while( WiFi.status() != WL_CONNECTED ) {
    delay( 500 );
    Serial.print( "." );
  }

  Serial.println();
  Serial.println( "Connected." );
  Serial.println( "IP address: " );
  Serial.println( WiFi.localIP() );
}

void setup() {
  Serial.begin( 115200 );
  
  setup_wifi();
  
  client.setServer( Constants::IOT_HOST, 1883 );
  client.setCallback( callback );
}

void reconnect() {
  while( !client.connected() ) {
    Serial.print( "Watson IoT ... " );

    if( client.connect( Constants::IOT_CLIENT, "use-token-auth", Constants::IOT_PASSWORD ) ) {
      Serial.println( "Connected" );
      // client.publish("outTopic", "hello world");
      // client.subscribe("inTopic");
    } else {
      Serial.print( " Failed. (rc = " );
      Serial.print( client.state() );
      Serial.println( ")" );
      Serial.println( "Trying again in 5 seconds." );

      delay( 5000 );
    }
  }
}

void loop() {
  if( !client.connected() ) {
    reconnect();
  }
  
  client.loop();

  long now = millis();
  
  if( now - lastMsg > 1000 ) {
    lastMsg = now;
    ++value;
    snprintf( msg, 75, "{\"count\": %ld}", value );
    
    Serial.print( "Publish message: " );
    Serial.println( msg );
    
    client.publish( "iot-2/evt/count/fmt/json", msg );
  }
}

