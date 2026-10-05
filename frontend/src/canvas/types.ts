import type { Edge, Node } from '@xyflow/react'

export type JiraCardData = { key: string; collapsed?: boolean }
export type JiraCardNode = Node<JiraCardData, 'jira_card'>

export type AppNode = JiraCardNode
export type AppEdge = Edge
