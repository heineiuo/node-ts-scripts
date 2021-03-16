export const commands = ['run', 'bundle', 'transform', 'metro'] as const
export type CommandType = typeof commands[number]
export type TargetPlatform = 'node' | 'browser' | 'react-native'

export type ImportMap = {
  imports: {
    [x: string]: string
  }
}
