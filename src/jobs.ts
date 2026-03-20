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