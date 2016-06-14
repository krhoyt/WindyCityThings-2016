// Physical parts
const int PIN_BUTTON = D1;
const int PIN_LED = D0;
const int PIN_PHOTOCELL = A0;

// Suppress multiple publishes
// Button down will continue to read high while down
// Even the quickest human effort would result in multiple high reads
// Only want to order one burger so toggle release state
bool hold = false;

// Send light values on non-blocking loop
long interval = 60;
long last = 0;

// Setup
void setup() {
    // Set LED as digital output
    // Button as digital input
    // Photocell as analog input
    pinMode( PIN_BUTTON, INPUT );
    pinMode( PIN_LED, OUTPUT );
    pinMode( PIN_PHOTOCELL, INPUT );

    // Register cloud functions
    // One for controlling LED
    // One for reporting interval
    Particle.function( "led", led );
    Particle.function( "rate", rate );
}

// Loop
// Nothing to do
void loop() {
  bool pressed = false;
  int light = 0;
  String data;

  // Read button state
  // Will be high or low
  pressed = digitalRead( PIN_BUTTON );

  // Read photocell level
  // Map to percentage value
  // Between 0 and 4095
  light = analogRead( PIN_PHOTOCELL );
  light = map( light, 0, 4095, 0, 100 );

  // Pressed
  if( pressed && !hold ) {
    // Track as pressed
    // Supress duplicates
    hold = true;

    // Unused
    // Passed for reference
    data = pressed;

    // Publish button press
    Particle.publish( "button", data, PRIVATE );
  }

  // Button has been released
  // Track state as released
  if( !pressed && hold ) {
    hold = false;
  }

  // Non-blocking delay
  // Wait one second
  if( ( Time.now() - last ) >= interval ) {
    // Update for next delay
    last = Time.now();

    // Light level
    data = String( light );

    // Publish light level
    Particle.publish( "light", data, PRIVATE );
  }
}

// Externally exposed function
// Called to change LED state
int led( String value ) {
  int result = -1;
  int state = value.toInt();

  if( state == 1 ) {
    digitalWrite( PIN_LED, HIGH );
    result = 1;
  } else if( state == 0 ) {
    digitalWrite( PIN_LED, LOW );
    result = 0;
  }

  return result;
}

// Externally exposed function
// Called to change reporting interval
int rate( String value ) {
  interval = value.toInt();
  return 1;
}
