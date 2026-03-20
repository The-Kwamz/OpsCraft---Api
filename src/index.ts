import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { Job } from "./jobs"

const jobs: Job[] = []
const SOLUTION_ID_START = 10001

function getNextSolutionId(): number {
  if (jobs.length === 0) return SOLUTION_ID_START
  return Math.max(...jobs.map((job) => job.solutionId)) + 1
}

export async function jobsHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Processing ${request.method} ${request.url}`)

  if (request.method === "GET") {
    return {
      status: 200,
      jsonBody: jobs,
    }
  }

  if (request.method === "POST") {
    const body = (await request.json()) as Partial<Job>

    const newJob: Job = {
      id: crypto.randomUUID(),
      solutionId: getNextSolutionId(),
      customerName: body.customerName ?? "",
      serviceType: body.serviceType ?? "",
      status: "new",
      scheduledDate: body.scheduledDate ?? null,
      address: body.address ?? "",
      notes: body.notes ?? "",
      createdAt: new Date().toISOString(),
    }

    jobs.push(newJob)

    return {
      status: 201,
      jsonBody: newJob,
    }
  }

  return {
    status: 405,
    jsonBody: { error: "Method not allowed" },
  }
}

app.http("jobs", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "jobs",
  handler: jobsHandler,
})