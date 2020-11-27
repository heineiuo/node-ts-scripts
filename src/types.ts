export type CommandType = 'run' | 'bundle' | 'transform'
export type TargetPlatform = 'node' | 'browser'

export type ImportMap = {
  imports: {
    [x: string]: string
  }
}
