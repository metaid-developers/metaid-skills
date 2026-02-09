# IDChat socket进程启动skills

1. IDChat socket用于监听IDChat socket推送消息

2. 以本地进程的方式在后台启动，有新消息推送过来之后，转发到其他进程服务，让其他服务能够监听到IDChat socket的消息，IDChat socket为一个单例服务，一个globalMetai为一个进程，在启动IDChat socket前必须指定globalMetai作为必要传入参数方可启动服务，如果同一个metaid启动了2个独立IDChat socket进程，则会导致前一个进程的消息监听链接断开，所以需要内置一个检测脚本每次启动IDChat socket都检查一下是否已经有相同的metaid进程在后台启动，有的话就杀掉旧进程再启动新进程

3. 开启IDChat socket要要求用户提供globalMetai，否则返回globalMetaid输入缺失，进程启动失败的提示

## 如何实现IDChat socket链接

1. 参考如下代码示例
```
import { io, Socket } from 'socket.io-client'
interface SocketConfig {
  url: string
  path: string
  metaid: string // 参数名改为 metaid（小写），值使用 globalMetaId
  type: 'app' | 'pc'
  heartbeatInterval?: number // 心跳间隔（毫秒）
  heartbeatTimeout?: number // 心跳超时时间（毫秒）
}

interface MessageData {
  message: string
  timestamp: number
  [key: string]: any
}

interface HeartbeatData {
  type: 'heartbeat'
  timestamp: number
  metaid: string // 参数名改为 metaid（小写）
}

class SocketIOClient {
  private socket: Socket | null = null
  private config: SocketConfig
  private heartbeatIntervalId: NodeJS.Timeout | null = null
  private heartbeatTimeoutId: NodeJS.Timeout | null = null
  private isHeartbeatRunning: boolean = false

  constructor(config: SocketConfig) {
    // 设置默认的心跳参数
    this.config = {
      heartbeatInterval: 30000, // 默认30秒
      heartbeatTimeout: 10000, // 默认10秒超时
      ...config,
    }
  }

  /**
   * 连接到Socket.IO服务器
   */
  public connect(): void {
    try {
      this.socket = io(this.config.url, {
        path: this.config.path,
        query: {
          metaid: this.config.metaid, // 参数名改为 metaid（小写），值使用 globalMetaId
          type: this.config.type,
        },
      })

      this.setupEventListeners()
      console.log('正在连接到服务器...')
    } catch (error) {
      console.error('连接失败:', error)
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    // 连接成功事件
    this.socket.on('connect', () => {
      console.log('✅ 已连接到服务器')
      console.log('连接ID:', this.socket?.id)
      this.logMessage('已连接到服务器')
      
      // 连接成功后启动心跳
      this.startHeartbeat()
    })

    // 断开连接事件
    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ 与服务器断开连接')
      console.log('断开原因:', reason)
      this.logMessage(`与服务器断开连接: ${reason}`)

      // 断开连接时停止心跳
      this.stopHeartbeat()
    })

    // 连接错误事件
    this.socket.on('connect_error', (error: Error) => {
      console.error('🔴 连接错误:', error)
      this.logMessage(`连接错误: ${error.message}`)

      // 连接错误时停止心跳
      this.stopHeartbeat()
    })

    // 接收消息事件
    this.socket.on('message', (data: MessageData) => {
      const ws = useWsStore()
      ws._handleReceivedMessage(data)
    })

    // 接收心跳响应事件
    this.socket.on('heartbeat_ack', (data: any) => {
      console.log('💓 收到心跳响应:', data)
      this.handleHeartbeatAck()
    })

    // 重新连接事件
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('🔄 重新连接成功，尝试次数:', attemptNumber)
      this.logMessage(`重新连接成功，尝试次数: ${attemptNumber}`)

      // 重新连接后重启心跳
      this.startHeartbeat()
    })

    // 重新连接尝试事件
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('🔄 尝试重新连接，次数:', attemptNumber)
      this.logMessage(`尝试重新连接，次数: ${attemptNumber}`)
    })

    // 重新连接错误事件
    this.socket.on('reconnect_error', (error: Error) => {
      console.error('🔴 重新连接错误:', error)
      this.logMessage(`重新连接错误: ${error.message}`)
    })
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    if (this.isHeartbeatRunning) {
      return
    }

    this.isHeartbeatRunning = true
    console.log('💓 启动心跳检测')

    // 清除可能存在的旧定时器
    this.stopHeartbeat()

    // 设置心跳间隔
    this.heartbeatIntervalId = setInterval(() => {
      this.sendHeartbeat()
    }, this.config.heartbeatInterval)

    // 立即发送第一次心跳
    this.sendHeartbeat()
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    this.isHeartbeatRunning = false

    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId)
      this.heartbeatIntervalId = null
    }

    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId)
      this.heartbeatTimeoutId = null
    }

    console.log('💔 停止心跳检测')
  }

  /**
   * 发送心跳包
   */
  private sendHeartbeat(): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('⚠️ 未连接到服务器，跳过心跳发送')
      return
    }

    try {
      // const heartbeatData: HeartbeatData = {
      //   type: 'heartbeat',
      //   timestamp: Date.now(),
      //   metaid: this.config.metaid
      // };
      const heartbeatMessage = { M: 'HEART_BEAT', C: 10 }
      //this.socket.emit('message', heartbeatMessage)

      this.socket.emit('ping')
      console.log('📤 发送心跳包:', heartbeatMessage)

    
    } catch (error) {
      console.error('发送心跳包失败:', error)
    }
  }



  /**
   * 处理心跳响应
   */
  private handleHeartbeatAck(): void {
    // 收到心跳响应，清除超时检测
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId)
      this.heartbeatTimeoutId = null
    }

    console.log('💓 心跳正常')
  }

  /**
   * 处理心跳超时
   */
  private handleHeartbeatTimeout(): void {
    console.error('💔 心跳超时，尝试重新连接')
    this.logMessage('心跳超时，尝试重新连接')

    // 断开当前连接
    this.disconnect()

    // 尝试重新连接
    setTimeout(() => {
      console.log('🔄 尝试重新连接...')
      this.connect()
    }, 5000)
  }

  /**
   * 发送消息
   */
  public sendMessage(message: string): void {
    if (!this.socket || !this.socket.connected) {
      console.error('❌ 未连接到服务器，无法发送消息')
      this.logMessage('未连接到服务器，无法发送消息')
      return
    }

    try {
      const messageData: MessageData = {
        message,
        timestamp: Date.now(),
      }

      this.socket.emit('message', messageData)
      console.log('📤 发送消息:', messageData)
      this.logMessage(`发送消息: ${message}`)
    } catch (error) {
      console.error('发送消息失败:', error)
      this.logMessage(`发送消息失败: ${error}`)
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    // 停止心跳检测
    this.stopHeartbeat()

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      console.log('🔌 已断开连接')
      this.logMessage('已断开连接')
    }
  }

  /**
   * 获取连接状态
   */
  public isConnected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * 获取Socket实例
   */
  public getSocket(): Socket | null {
    return this.socket
  }

  /**
   * 记录消息到控制台
   */
  private logMessage(message: string): void {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[${timestamp}] ${message}`)
  }
}

```

```
interface MessageData {
  message: string
  timestamp: number
  [key: string]: any
}

interface SocketConfig {
  url: string
  path: string
  metaid: string // 参数名改为 metaid（小写），值使用 globalMetaId
  type: 'pc' | 'app'
}



 async init() {
      const selfGlobalMetaId = this.globalMetaId // 使用 globalMetaId 值
    
      if (!selfGlobalMetaId) return
      const config: SocketConfig = {
        url: "https://api.idchat.io",
        path: '/socket/socket.io',
        metaid: selfGlobalMetaId, 
        type: 'pc',
      }

      this.ws = new SocketIOClient(config)
      this.ws.connect()

   
    }

  disconnect() {
      this.ws?.disconnect()
    }

    async _handleReceivedMessage(data: MessageData) {
     
      const messageWrapper = JSON.parse(data)
      switch (messageWrapper.M) {
        case 'WS_SERVER_NOTIFY_GROUP_CHAT':
          
          console.log('收到新消息', messageWrapper.D)
          await simpleTalkStore.receiveMessage(messageWrapper.D)

         
          return
        case 'WS_SERVER_NOTIFY_PRIVATE_CHAT':
      
          console.log('收到新消息', messageWrapper.D)
          await simpleTalkStore.receiveMessage(messageWrapper.D)
      
          return
        case 'WS_SERVER_NOTIFY_GROUP_ROLE':
          await simpleTalkStore.receiveUserRoleMessage(messageWrapper.D)
          return
        case 'WS_SERVER_NOTIFY_TX_TASK':
          await jobsStore.handleWsMessage(messageWrapper.D)
          return

        default:
          break
      }
    },
```