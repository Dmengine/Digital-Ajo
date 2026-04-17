import AppKit

func hex(_ h: String, _ a: CGFloat = 1.0) -> NSColor {
    let s = h.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var v: UInt64 = 0
    Scanner(string: s).scanHexInt64(&v)
    return NSColor(
        red: CGFloat((v >> 16) & 0xFF) / 255,
        green: CGFloat((v >> 8) & 0xFF) / 255,
        blue: CGFloat(v & 0xFF) / 255,
        alpha: a
    )
}

func writePNG(_ image: NSImage, to path: String) throws {
    guard let tiff = image.tiffRepresentation,
          let rep = NSBitmapImageRep(data: tiff),
          let png = rep.representation(using: .png, properties: [:]) else {
        throw NSError(domain: "icon", code: 1)
    }
    try png.write(to: URL(fileURLWithPath: path))
}

func drawGlyph(in rect: NSRect) {
    let panel = NSBezierPath(roundedRect: rect, xRadius: rect.width * 0.22, yRadius: rect.height * 0.22)
    hex("D6BAFF", 0.18).setFill()
    panel.fill()

    let cFont = NSFont.systemFont(ofSize: rect.width * 0.60, weight: .black)
    let cAttr: [NSAttributedString.Key: Any] = [.font: cFont, .foregroundColor: hex("D6BAFF")]
    let c = NSAttributedString(string: "C", attributes: cAttr)
    let cSize = c.size()
    c.draw(at: NSPoint(x: rect.midX - cSize.width * 0.57, y: rect.midY - cSize.height * 0.45))

    let coin = NSRect(x: rect.maxX - rect.width * 0.30, y: rect.minY + rect.height * 0.12, width: rect.width * 0.23, height: rect.width * 0.23)
    let coinPath = NSBezierPath(ovalIn: coin)
    hex("40E56C").setFill()
    coinPath.fill()

    let nFont = NSFont.systemFont(ofSize: coin.width * 0.52, weight: .heavy)
    let nAttr: [NSAttributedString.Key: Any] = [.font: nFont, .foregroundColor: hex("003912")]
    let n = NSAttributedString(string: "N", attributes: nAttr)
    let nSize = n.size()
    n.draw(at: NSPoint(x: coin.midX - nSize.width / 2, y: coin.midY - nSize.height / 2 + 1))
}

let size = NSSize(width: 1024, height: 1024)
let full = NSRect(origin: .zero, size: size)

let icon = NSImage(size: size)
icon.lockFocus()

let back = NSBezierPath(roundedRect: full, xRadius: 220, yRadius: 220)
back.addClip()
let gradient = NSGradient(colors: [hex("111417"), hex("2B1F35"), hex("1D2023")])!
gradient.draw(in: full, angle: 310)
hex("AB73FF", 0.25).setFill()
NSBezierPath(ovalIn: NSRect(x: 110, y: 650, width: 430, height: 430)).fill()
hex("40E56C", 0.13).setFill()
NSBezierPath(ovalIn: NSRect(x: 600, y: 120, width: 300, height: 300)).fill()

drawGlyph(in: NSRect(x: 200, y: 200, width: 624, height: 624))
icon.unlockFocus()

let adaptive = NSImage(size: size)
adaptive.lockFocus()
NSColor.clear.setFill()
full.fill()
drawGlyph(in: NSRect(x: 168, y: 168, width: 688, height: 688))
adaptive.unlockFocus()

let favicon = NSImage(size: NSSize(width: 64, height: 64))
favicon.lockFocus()
icon.draw(in: NSRect(x: 0, y: 0, width: 64, height: 64), from: full, operation: .copy, fraction: 1.0)
favicon.unlockFocus()

do {
    try writePNG(icon, to: "assets/icon.png")
    try writePNG(adaptive, to: "assets/adaptive-icon.png")
    try writePNG(favicon, to: "assets/favicon.png")
    print("Icon assets generated")
} catch {
    fputs("Icon generation failed: \(error)\n", stderr)
    exit(1)
}
