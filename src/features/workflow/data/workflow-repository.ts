import type { WorkflowRepository } from './types'

const workflowPayloadUrl = '/payload.json'

function createHttpWorkflowRepository(request: typeof fetch = fetch): WorkflowRepository {
  return {
    async getWorkflow() {
      const response = await request(workflowPayloadUrl)

      if (!response.ok) {
        throw new Error(`Unable to load workflow (${response.status})`)
      }

      return response.json()
    },
  }
}

export const workflowRepository = createHttpWorkflowRepository()
