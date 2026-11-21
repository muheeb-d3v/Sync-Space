import './polyfill.js';
import express from 'express';
import { CLIENT_ORIGIN, ENV_FILE, ENV_FILE_SOURCE, NODE_ENV, PORT } from './config/serverConfig.js'
import connectDB, { isDatabaseConnected } from './config/dbConfig.js'
import apiRouter from './routes/apiRoutes.js'
import StatusCodes from 'http-status-codes'
import { customErrorResponse } from './utils/common/responseObjects.js'
import cors from 'cors'
import bullBoardApp from './server/bullboard.js'
import { Server } from 'socket.io'
import { createServer } from 'http'
import Redis from 'ioredis'
import redisConfig from './config/redisConfig.js'
import messageHandler from './controllers/channelSocketController.js'
import syncSocketHandler from './controllers/syncSocketController.js'
import { startSyncSweeper } from './services/syncService.js'


const app = express()
const server = createServer(app)

/**
 * CORS allowlist.
 *
 * Explicit entries come from CLIENT_ORIGIN (comma separated). In development
 * we additionally accept loopback hosts, private LAN addresses (e.g. testing
 * from a phone on 192.168.x.x) and common dev-tunnel domains, because another
 * device testing over LAN / a tunnel sends an Origin that cannot be predicted
 * day to day. Production stays strict: only the configured origins.
 */
const configuredOrigins = CLIENT_ORIGIN
  ? CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : []

const isLoopbackOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin)
const isLanIpOrigin = (origin) => /^http:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?$/i.test(origin)
const isDevTunnelOrigin = (origin) =>
  /^https?:\/\/([a-z0-9-]+\.)*(loca\.lt|ngrok-free\.app|ngrok\.io|trycloudflare\.com)$/i.test(origin)

const corsOriginCheck = (origin, callback) => {
  if (!origin) return callback(null, true) // curl / same-origin / server-to-server
  if (configuredOrigins.includes(origin)) return callback(null, true)
  if (NODE_ENV !== 'production' && (isLoopbackOrigin(origin) || isLanIpOrigin(origin) || isDevTunnelOrigin(origin))) {
    return callback(null, true)
  }
  return callback(null, configuredOrigins.length === 0 ? true : false)
}

// Socket.IO routes through the `cors` package as well, so the same predicate
// works for the websocket handshake.
export const io = new Server(server, {
  cors: {
    origin: corsOriginCheck,
    methods: ['GET', 'POST']
  }
})
app.use(cors({ origin: corsOriginCheck }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api', apiRouter)
app.use(bullBoardApp)

// Multer middleware errors (oversized files / disallowed types) arrive here —
// translate them into clean JSON 400s instead of Express's HTML error page.
app.use((error, req, res, next) => {
    if (error?.name === 'MulterError') {
        const isAvatarUpload =
            req.originalUrl?.includes('/users/avatar') || error.field === 'avatar';
        const message = isAvatarUpload
            ? error.code === 'LIMIT_FILE_SIZE'
                ? 'Image is too large. Maximum size is 5 MB.'
                : 'Avatar must be a PNG, JPEG, GIF or WebP image.'
            : error.code === 'LIMIT_FILE_SIZE'
                ? 'File is too large. Maximum size is 25 MB per file.'
                : error.code === 'LIMIT_FILE_COUNT'
                    ? 'Too many files. Maximum is 10 per message.'
                    : 'One of the selected files is not a supported type.';
        return res.status(StatusCodes.BAD_REQUEST).json(
            customErrorResponse({
                explanation: `Multer ${error.code}`,
                message: `Upload rejected: ${message}`,
                statusCode: StatusCodes.BAD_REQUEST
            })
        );
    }
    return next(error);
})
app.get('/ping', (req, res) => {
  return res.status(StatusCodes.OK).json({ message: 'pong' })
})

// A standalone Redis client used for startup verification and health checks.
// Bull/ioredis creates its own shared connection for the mail queue; this
// client is only for reporting Redis availability.
export const redis = new Redis(redisConfig)
let redisConnected = false

redis.on('connect', () => {
  redisConnected = true
  console.log('[REDIS] Connected to Redis')
})
redis.on('error', (error) => {
  redisConnected = false
  console.error(`[REDIS] Connection error: ${error.message}`)
})

app.get('/health', (req, res) => {
  const database = isDatabaseConnected() ? 'connected' : 'disconnected'
  const redisStatus = redisConnected ? 'connected' : 'disconnected'
  const healthy = isDatabaseConnected() && redisConnected
  return res.status(healthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE).json({
    status: healthy ? 'ok' : 'degraded',
    database,
    redis: redisStatus,
  })
})

io.on('connection', (socket) => {
  messageHandler(io , socket)
  syncSocketHandler(io, socket)
})

const start = async () => {
  console.log(`Env file: ${ENV_FILE} (${ENV_FILE_SOURCE})`)

  try {
    await connectDB()
  } catch (error) {
    console.error('='.repeat(72))
    console.error(`[DB] FATAL: ${error.message}`)
    console.error('[DB] The server starts, but every database request answers 503.')
    console.error('='.repeat(72))
  }

  // Verify Redis connectivity (non-fatal: Bull retries on its own).
  try {
    await redis.ping()
  } catch (error) {
    console.warn(`[REDIS] Could not ping Redis: ${error.message}`)
    console.warn('[REDIS] The server starts, but the mail queue will retry in the background.')
  }

  server.listen(PORT, () => {
    console.log(`Running on ${PORT}...`)
    console.log(`Allowed origins: ${configuredOrigins.join(', ') || `default (${NODE_ENV === 'production' ? 'configured only' : 'loopback + LAN + dev tunnels'})`}`)
    console.log('For the UI, open http://localhost:3000/admin/queues')
    // Marks crashed/dropped sync participants as gone on an interval.
    startSyncSweeper()
  })
}

start()

