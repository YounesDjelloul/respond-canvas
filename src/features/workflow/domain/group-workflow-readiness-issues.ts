import { indexWorkflowGraph } from './index-workflow-graph'
import type {
  WorkflowGraph,
  WorkflowGraphIndex,
  WorkflowNode,
  WorkflowReadinessError,
  WorkflowReadinessFix,
  WorkflowReadinessIssue,
  WorkflowReadinessIssueGroup,
} from './types'

export function groupWorkflowReadinessIssues(
  graph: WorkflowGraph,
  errors: readonly WorkflowReadinessError[],
  index: WorkflowGraphIndex = indexWorkflowGraph(graph),
): WorkflowReadinessIssueGroup[] {
  const { nodesById } = index
  const workflowIssues: WorkflowReadinessIssue[] = []
  const issuesByNodeId = new Map<string, WorkflowReadinessIssue[]>()

  for (const error of errors) {
    const [root, nodeId, ...fieldPath] = error.path ?? []
    const node =
      root === 'nodes' && typeof nodeId === 'string' ? nodesById.get(nodeId) : undefined
    const issue = { code: error.code, message: error.message, fieldPath }

    if (!node) {
      addUniqueIssue(workflowIssues, { ...issue, fieldPath: [] })
      continue
    }

    const nodeIssues = issuesByNodeId.get(node.id) ?? []
    addUniqueIssue(nodeIssues, issue)
    issuesByNodeId.set(node.id, nodeIssues)
  }

  const nodeGroups = graph.nodes.flatMap((node): WorkflowReadinessIssueGroup[] => {
    const issues = issuesByNodeId.get(node.id)

    return issues ? [{ node, fix: fixFor(node, issues), issues }] : []
  })

  return workflowIssues.length > 0
    ? [{ node: null, fix: 'none', issues: workflowIssues }, ...nodeGroups]
    : nodeGroups
}

function fixFor(
  node: WorkflowNode,
  issues: readonly WorkflowReadinessIssue[],
): WorkflowReadinessFix {
  const needsNextStep = issues.some((issue) => issue.code === 'outgoing-path-required')
  const hasOwnProblem = issues.some((issue) => issue.code !== 'outgoing-path-required')

  if (node.editable && hasOwnProblem) {
    return 'open-node'
  }

  if (needsNextStep) {
    return 'add-step'
  }

  return node.editable ? 'open-node' : 'none'
}

function addUniqueIssue(
  issues: WorkflowReadinessIssue[],
  issue: WorkflowReadinessIssue,
) {
  const isDuplicate = issues.some(
    (existing) =>
      existing.message === issue.message &&
      existing.fieldPath.join('.') === issue.fieldPath.join('.'),
  )

  if (!isDuplicate) {
    issues.push(issue)
  }
}
