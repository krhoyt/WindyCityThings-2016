import CoreBluetooth
import UIKit

class ViewController: UIViewController, CBCentralManagerDelegate, CBPeripheralDelegate {

    @IBOutlet weak var emphasize: UIView!
    @IBOutlet weak var chart: ChartView!
    
    var led:CBCharacteristic!
    var manager:CBCentralManager!
    var peripheral:CBPeripheral!
    var state:UInt8 = 0;
    
    let BUTTON_UUID = CBUUID( string: "aadae336-7ebb-4381-bdad-801627309d5e" );
    let LED_UUID = CBUUID( string: "44cfb349-9b03-49ea-a2cf-af34efe48c0b" );
    let LIGHT_UUID = CBUUID( string: "457e4a36-08ae-4198-b4d9-215711017e96" )
    let WINDY_NAME = "Windy"
    let WINDY_UUID = CBUUID( string: "9e10baf4-8d10-4046-a99e-dd9b3f2caf16" );
    
    override func viewDidLoad() {
        super.viewDidLoad()
                
        // Charting
        chart.backgroundColor = UIColor.clearColor()
        
        // Bluetooth
        manager = CBCentralManager(delegate: self, queue: nil)
    }

    // Toggle LED
    @IBAction func toggle(sender: AnyObject) {
        // Toggle state
        if state == 0 {
            state = 1
        } else if state == 1 {
            state = 0
        }
        
        // Send to device
        if led != nil {
            let data = NSData(bytes: &state, length: sizeof(UInt8))
            peripheral.writeValue(data, forCharacteristic: led, type: CBCharacteristicWriteType.WithResponse)
        }
    }
    
    // Scan
    func centralManagerDidUpdateState(central: CBCentralManager) {
        if central.state == CBCentralManagerState.PoweredOn {
            central.scanForPeripheralsWithServices(nil, options: nil)
        } else {
            print("Bluetooth not available.")
        }
    }

    // Connect
    func centralManager(central: CBCentralManager, didDiscoverPeripheral peripheral: CBPeripheral, advertisementData: [String : AnyObject], RSSI: NSNumber) {
        let device = (advertisementData as NSDictionary).objectForKey(CBAdvertisementDataLocalNameKey) as? NSString
        
        if device?.containsString(WINDY_NAME) == true {
            debugPrint("Found Windy.")
            
            // Stop scanning
            self.manager.stopScan()
            
            // Reference device
            self.peripheral = peripheral
            self.peripheral.delegate = self
            
            // Connect
            manager.connectPeripheral(peripheral, options: nil)
        }
    }
    
    // Get services
    func centralManager(central: CBCentralManager, didConnectPeripheral peripheral: CBPeripheral) {
        debugPrint("Getting services...");
        peripheral.discoverServices(nil)
    }

    // List services
    // Get characteristics
    func peripheral(peripheral: CBPeripheral, didDiscoverServices error: NSError?) {
        for service in peripheral.services! {
            let thisService = service as CBService
        
            if service.UUID == WINDY_UUID {
                print("Using Windy.")
                peripheral.discoverCharacteristics(nil, forService: thisService)
            }
        }
    }
    
    // List characteristics
    // Set to notify for desired characteristics
    func peripheral(peripheral: CBPeripheral, didDiscoverCharacteristicsForService service: CBService, error: NSError?) {
        debugPrint("Enabling...")
        
        for characteristic in service.characteristics! {
            let thisCharacteristic = characteristic as CBCharacteristic
     
            debugPrint("Characteristic: ", thisCharacteristic.UUID)
            
            if thisCharacteristic.UUID == LIGHT_UUID {
                debugPrint("Notify for light.")
                self.peripheral.setNotifyValue(true, forCharacteristic: thisCharacteristic)
            } else if thisCharacteristic.UUID == BUTTON_UUID {
                debugPrint("Notify for button.")
                self.peripheral.setNotifyValue(true, forCharacteristic: thisCharacteristic)
            } else if thisCharacteristic.UUID == LED_UUID {
                debugPrint("Assign LED.");
                led = thisCharacteristic
            }
        }
    }
    
    // Notifications
    func peripheral(peripheral: CBPeripheral, didUpdateValueForCharacteristic characteristic: CBCharacteristic, error: NSError?) {
        var button:UInt8 = 0;
        var light:UInt8 = 0;
        
        if characteristic.UUID == LIGHT_UUID {
            characteristic.value!.getBytes(&light, length: sizeof(UInt8))
            
            // Chart values
            chart.add(Int(light))
            
            debugPrint(light)
        } else if characteristic.UUID == BUTTON_UUID {
            characteristic.value!.getBytes(&button, length: sizeof(UInt8))
            
            // Bring to full red
            self.emphasize.alpha = 1;
            
            // Fade over one second
            UIView.animateWithDuration(1.0, animations: {
                self.emphasize.alpha = 0;
            })
            
            debugPrint(button)
        }
    }
    
    // Disconnect
    // Try again
    func centralManager(central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: NSError?) {
        central.scanForPeripheralsWithServices(nil, options: nil)
    }
    
}
