import mongoose, { type Mongoose } from "mongoose"

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local",
    )
  }

  return uri
}

const MONGODB_URI = getMongoUri()

/**
 * Persists the Mongoose connection across Next.js hot reloads in development.
 * Without this cache, each reload would open a new connection and exhaust the pool.
 */
interface MongooseCache {
  conn: Mongoose | null
  promise: Promise<Mongoose> | null
}

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache
}

const cached: MongooseCache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
}

if (!globalForMongoose.mongooseCache) {
  globalForMongoose.mongooseCache = cached
}

/**
 * Returns a singleton Mongoose instance connected to MongoDB.
 * Call this before running queries in Server Components, Route Handlers, or Server Actions.
 */
export async function connectDB(): Promise<Mongoose> {
  // Reuse an already-established connection.
  if (cached.conn) {
    return cached.conn
  }

  // Deduplicate concurrent connection attempts during cold starts.
  if (!cached.promise) {
    const options = {
      // Fail fast when disconnected instead of buffering commands indefinitely.
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, options)
  }

  try {
    cached.conn = await cached.promise
  } catch (error) {
    // Allow retries after a failed connection attempt.
    cached.promise = null
    throw error
  }

  return cached.conn
}
