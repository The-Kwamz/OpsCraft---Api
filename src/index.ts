import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { Job } from "./jobs"

const jobs: Job[] = []

export async function jobsHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Processing ${request.method} ${request.url}`)

  return {
    status: 200,
    jsonBody: jobs,
  }
}

app.http("jobs", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "jobs",
  handler: jobsHandler,
})