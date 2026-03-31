import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import * as sql from "mssql"
import {
  CreateJobInput,
  JobRow,
  mapJobRow,
  mapJobRows,
  normalizeCreateJobInput,
} from "./jobs"

const globalForSql = globalThis as typeof globalThis & {
  sqlPoolPromise?: Promise<sql.ConnectionPool>
}

async function getPool(): Promise<sql.ConnectionPool> {
  const connectionString = process.env.SQL_CONNECTION_STRING

  if (!connectionString) {
    throw new Error("SQL_CONNECTION_STRING is not set")
  }

  if (!globalForSql.sqlPoolPromise) {
    globalForSql.sqlPoolPromise = new sql.ConnectionPool(connectionString).connect()
  }

  return globalForSql.sqlPoolPromise
}

function badRequest(message: string): HttpResponseInit {
  return {
    status: 400,
    jsonBody: { error: message },
  }
}

function internalServerError(): HttpResponseInit {
  return {
    status: 500,
    jsonBody: { error: "Internal server error" },
  }
}

async function getAllJobs(context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const pool = await getPool()

    const result = await pool.request().query(`
      SELECT
        Id,
        SolutionId,
        CustomerName,
        ServiceType,
        Status,
        ScheduledDate,
        Address,
        Notes,
        CreatedAt
      FROM dbo.Jobs
      ORDER BY SolutionId DESC
    `)

    return {
      status: 200,
      jsonBody: mapJobRows(result.recordset as JobRow[]),
    }
  } catch (error) {
    context.log("Failed to fetch jobs", error)
    return internalServerError()
  }
}

async function getJobById(id: string, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const pool = await getPool()

    const result = await pool.request()
      .input("id", sql.UniqueIdentifier, id)
      .query(`
        SELECT TOP 1
          Id,
          SolutionId,
          CustomerName,
          ServiceType,
          Status,
          ScheduledDate,
          Address,
          Notes,
          CreatedAt
        FROM dbo.Jobs
        WHERE Id = @id
      `)

    const row = result.recordset[0] as JobRow | undefined

    if (!row) {
      return {
        status: 404,
        jsonBody: { error: "Job not found" },
      }
    }

    return {
      status: 200,
      jsonBody: mapJobRow(row),
    }
  } catch (error) {
    context.log("Failed to fetch job by id", error)
    return internalServerError()
  }
}

async function createJob(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: CreateJobInput

  try {
    body = (await request.json()) as CreateJobInput
  } catch {
    return badRequest("Request body must be valid JSON")
  }

  const normalized = normalizeCreateJobInput(body)

  if (!normalized.customerName) {
    return badRequest("customerName is required")
  }

  if (!normalized.serviceType) {
    return badRequest("serviceType is required")
  }

  if (!normalized.address) {
    return badRequest("address is required")
  }

  let scheduledDateValue: Date | null = null

  if (normalized.scheduledDate !== null) {
    const parsedDate = new Date(normalized.scheduledDate)

    if (Number.isNaN(parsedDate.getTime())) {
      return badRequest("scheduledDate must be a valid ISO date string or null")
    }

    scheduledDateValue = parsedDate
  }

  try {
    const pool = await getPool()

    const result = await pool.request()
      .input("id", sql.UniqueIdentifier, crypto.randomUUID())
      .input("customerName", sql.NVarChar(200), normalized.customerName)
      .input("serviceType", sql.NVarChar(100), normalized.serviceType)
      .input("scheduledDate", sql.DateTime2, scheduledDateValue)
      .input("address", sql.NVarChar(300), normalized.address)
      .input("notes", sql.NVarChar(sql.MAX), normalized.notes)
      .query(`
        INSERT INTO dbo.Jobs (
          Id,
          CustomerName,
          ServiceType,
          ScheduledDate,
          Address,
          Notes
        )
        OUTPUT
          INSERTED.Id,
          INSERTED.SolutionId,
          INSERTED.CustomerName,
          INSERTED.ServiceType,
          INSERTED.Status,
          INSERTED.ScheduledDate,
          INSERTED.Address,
          INSERTED.Notes,
          INSERTED.CreatedAt
        VALUES (
          @id,
          @customerName,
          @serviceType,
          @scheduledDate,
          @address,
          @notes
        )
      `)

    const row = result.recordset[0] as JobRow

    return {
      status: 201,
      jsonBody: mapJobRow(row),
    }
  } catch (error) {
    context.log("Failed to create job", error)
    return internalServerError()
  }
}

export async function jobsHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Processing ${request.method} ${request.url}`)

  if (request.method === "GET") {
    const id = request.params.id?.trim()

    if (id) {
      return getJobById(id, context)
    }

    return getAllJobs(context)
  }

  if (request.method === "POST") {
    return createJob(request, context)
  }

  return {
    status: 405,
    jsonBody: { error: "Method not allowed" },
  }
}

app.http("jobs", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "jobs/{id?}",
  handler: jobsHandler,
})