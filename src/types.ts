export const commands = ['run', 'bundle', 'transform', 'metro'] as const
export type CommandType = typeof commands[number]
export type TargetPlatform = 'node' | 'browser' | 'ios' | 'android' | 'server'

export type ImportMap = {
  imports: {
    [x: string]: string
  }
}
