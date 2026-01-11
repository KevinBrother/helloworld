// The Swift Programming Language
// https://docs.swift.org/swift-book
import Figlet
import ArgumentParser
@main
// struct MyCLI {
//     static func main() {
//         print("Hello, world!")
//     }
// }

/* 
struct FigletTool {
  static func main() {
    Figlet.say("Hello, Swift!")
  }
} */

struct FigletTool: ParsableCommand {
  @Option(help: "Specify the input")
  public var input: String

  public func run() throws {
    Figlet.say(self.input)
  }
}