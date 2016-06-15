import UIKit

class ChartView: UIView {
    
    var points:Array<Int> = []
    
    func add(value: Int) {
        // Limit to one hundred elements
        if points.count == 100 {
            points.removeAtIndex(0)
        }
        
        // Add latest value
        points.append(value)
        
        // Draw
        setNeedsDisplay()
    }
    
    override func drawRect(rect: CGRect) {
        let horizontal = rect.width / 100;
        let path = UIBezierPath()
        let vertical = rect.height / 100;
        
        if points.count == 0 {
            return
        }
        
        // Styles
        path.lineWidth = 2.0
        UIColor.whiteColor().setStroke()
        
        // Move to start
        path.moveToPoint(CGPoint(
            x: 0,
            y: Int(rect.height - (CGFloat(points[0]) * vertical))
        ))
        
        for (index, element) in points.enumerate() {
            path.addLineToPoint(CGPoint(
                x: Int(CGFloat(index) * horizontal),
                y: Int(rect.height - (CGFloat(element) * vertical))
            ))
        }
        
        path.stroke()
    }
    
}
