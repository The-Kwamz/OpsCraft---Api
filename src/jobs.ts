export type JobStatus = 'new' | 'scheduled' | 'in_progress' | 'completed'

export type Job = {
  id: string
  solutionId: number
  customerName: string
  serviceType: string
  status: JobStatus
  scheduledDate: string | null
  address: string
  notes: string
  createdAt: string
}

export type CreateJobInput = {
  customerName: string
  serviceType: string
  address: string
  notes?: string
  scheduledDate?: string | null
}

export type JobRow = {
  Id: string
  SolutionId: number
  CustomerName: string
  ServiceType: string
  Status: string
  ScheduledDate: Date | string | null
  Address: string
  Notes: string | null
  CreatedAt: Date | string
}

const VALID_JOB_STATUSES: JobStatus[] = [
  'new',
  'scheduled',
  'in_progress',
  'completed',
]

export function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === 'string' && VALID_JOB_STATUSES.includes(value as JobStatus)
}

export function normalizeJobStatus(value: unknown): JobStatus {
  if (isJobStatus(value)) {
    return value
  }

  return 'new'
}

export function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return new Date(value).toISOString()
}

export function toIsoStringOrNull(value: Date | string | null): string | null {
  if (value === null) {
    return null
  }

  return toIsoString(value)
}

export function mapJobRow(row: JobRow): Job {
  return {
    id: row.Id,
    solutionId: row.SolutionId,
    customerName: row.CustomerName,
    serviceType: row.ServiceType,
    status: normalizeJobStatus(row.Status),
    scheduledDate: toIsoStringOrNull(row.ScheduledDate),
    address: row.Address,
    notes: row.Notes ?? '',
    createdAt: toIsoString(row.CreatedAt),
  }
}

export function mapJobRows(rows: JobRow[]): Job[] {
  return rows.map(mapJobRow)
}

export function normalizeCreateJobInput(input: CreateJobInput) {
  return {
    customerName: input.customerName.trim(),
    serviceType: input.serviceType.trim(),
    address: input.address.trim(),
    notes: (input.notes ?? '').trim(),
    scheduledDate: input.scheduledDate ?? null,
  }
}