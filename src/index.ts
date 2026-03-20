import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { Job } from "./jobs"

const jobs: Job[] = []

export async function jobsHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Processing ${request.method} ${request.url}`)

  const jobId = request.params.id

  if (request.method === "GET") {
    if (jobId) {
      const job = jobs.find((item) => item.id === jobId)

      if (!job) {
        return {
          status: 404,
          jsonBody: { error: "Job not found" },
        }
      }

      return {
        status: 200,
        jsonBody: job,
      }
    }

    return {
      status: 200,
      jsonBody: jobs,
    }
  }

  if (request.method === "POST") {
    const body = (await request.json()) as Partial<Job>

    const newJob: Job = {
      id: crypto.randomUUID(),
      customerName: body.customerName ?? "",
      serviceType: body.serviceType ?? "",
      status: "new",
      scheduledDate: null,
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
  route: "jobs/{id?}",
  handler: jobsHandler,
})