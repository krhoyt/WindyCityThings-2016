import CoreBluetooth
import UIKit

class ViewController: UIViewController, CBCentralManagerDelegate, CBPeripheralDelegate {

    var manager:CBCentralManager!
    var peripheral:CBPeripheral!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        manager = CBCentralManager(delegate: self, queue: nil)
    }

    func centralManagerDidUpdateState(central: CBCentralManager) {
        if central.state == CBCentralManagerState.PoweredOn {
            central.scanForPeripheralsWithServices(nil, options: nil)
        } else {
            print("Bluetooth not available.")
        }
    }

    func centralManager(
        central: CBCentralManager,
        didDiscoverPeripheral peripheral: CBPeripheral,
                              advertisementData: [String : AnyObject],
                              RSSI: NSNumber) {
        let device = (advertisementData as NSDictionary)
            .objectForKey(CBAdvertisementDataLocalNameKey)
            as? NSString
     
        debugPrint(device)
        
        if device?.containsString("count") == true {
            print("Found echo.")
            
            self.manager.stopScan()
            
            self.peripheral = peripheral
            self.peripheral.delegate = self
            
            manager.connectPeripheral(peripheral, options: nil)
        }
    }
    
    func centralManager(
        central: CBCentralManager,
        didConnectPeripheral peripheral: CBPeripheral) {
        peripheral.discoverServices(nil)
    }
    
    let BEAN_SERVICE_UUID =
        CBUUID(string: "9e10baf4-8d10-4046-a99e-dd9b3f2caf16")
    
    func peripheral(
        peripheral: CBPeripheral,
        didDiscoverServices error: NSError?) {
        for service in peripheral.services! {
            let thisService = service as CBService
            
            if service.UUID == BEAN_SERVICE_UUID {
                print("Found service.")
                peripheral.discoverCharacteristics(
                    nil,
                    forService: thisService
                )
            }
        }
    }

    let BEAN_DATA_UUID =
        CBUUID(string: "457e4a36-08ae-4198-b4d9-215711017e96")
    
    func peripheral(
        peripheral: CBPeripheral,
        didDiscoverCharacteristicsForService service: CBService,
                                             error: NSError?) {
        for characteristic in service.characteristics! {
            let thisCharacteristic = characteristic as CBCharacteristic
     
            debugPrint( thisCharacteristic.UUID )
            
            if thisCharacteristic.UUID == BEAN_DATA_UUID {
                print("Found characteristic.")
                self.peripheral.setNotifyValue(
                    true, 
                    forCharacteristic: thisCharacteristic
                )
            }
        }
    }
    
    func peripheral(
        peripheral: CBPeripheral,
        didUpdateValueForCharacteristic characteristic: CBCharacteristic,
                                        error: NSError?) {
        var count:UInt32 = 0;
        
        if characteristic.UUID == BEAN_DATA_UUID {
            characteristic.value!.getBytes(&count, length: sizeof(UInt32))
            debugPrint(count)
            // labelCount.text = NSString(format: "%llu", count) as String
        }
    }
    
    func centralManager(
        central: CBCentralManager,
        didDisconnectPeripheral peripheral: CBPeripheral,
                                error: NSError?) {
        central.scanForPeripheralsWithServices(nil, options: nil)
    }
    
}

