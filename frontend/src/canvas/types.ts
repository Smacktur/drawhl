import type { Edge, Node } from '@xyflow/react'

export type JiraCardData = { key: string; collapsed?: boolean }
export type JiraCardNode = Node<JiraCardData, 'jira_card'>

export type FrameData = { title: string }
export type FrameNode = Node<FrameData, 'frame'>

export const STICKY_COLORS = ['yellow', 'orange', 'pink', 'violet', 'blue', 'green'] as const
export type StickyColor = (typeof STICKY_COLORS)[number]
export type StickyData = { text: string; color: StickyColor }
export type StickyNode = Node<StickyData, 'sticky'>

export type TextData = { text: string }
export type TextNode = Node<TextData, 'text'>

export type ModuleData = { kind: string; title?: string; content: unknown }
export type ModuleNode = Node<ModuleData, 'module'>

// The free end of an arrow that points somewhere instead of at an element.
export type AnchorNode = Node<Record<string, never>, 'anchor'>

export type AppNode = JiraCardNode | FrameNode | StickyNode | TextNode | ModuleNode | AnchorNode
export type AppEdge = Edge
