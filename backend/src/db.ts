import pg, { PoolClient } from "pg";
import process from "process";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://r-board:secret@localhost:13338/r-board"

const pgConfig = {
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_URL ? {
        rejectUnauthorized: false
    } : undefined
}
const connectionPool = new pg.Pool(pgConfig)

export async function initDB() {
    await withDBClient(async client => {
        await client.query(`
            CREATE TABLE IF NOT EXISTS boards (id SERIAL PRIMARY KEY, name text NOT NULL);
        `);
    })    
}

export async function withDBClient<T>(f: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await connectionPool.connect()
    try {
        return f(client)
    } finally {
        client.release()
    }
}