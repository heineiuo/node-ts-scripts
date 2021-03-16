export type CommandType = 'run' | 'bundle' | 'transform' | 'metro'
export type TargetPlatform = 'node' | 'browser' | 'react-native'

export type ImportMap = {
  imports: {
    [x: string]: string
  }
}
