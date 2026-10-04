export const COLORS = ['coral', 'amber', 'sage', 'blue', 'violet', 'rose'] as const
export type Color = (typeof COLORS)[number]
export type Priority = 'low' | 'medium' | 'high'
export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly'
export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}
export interface Entry {
  id: string
  seriesId: string
  kind: 'task' | 'note'
  title: string
  body: string
  folderId: string | null
  color: Color
  priority: Priority
  pinned: boolean
  dueDate: string
  dueTime: string
  repeat: Repeat
  completed: boolean
  checklist: ChecklistItem[]
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  deletedAt: string | null
}
export interface Folder {
  id: string
  name: string
  color: Color
}
export interface Workspace {
  version: 1
  entries: Entry[]
  folders: Folder[]
}
export type View =
  | 'all'
  | 'today'
  | 'upcoming'
  | 'notes'
  | 'completed'
  | 'archive'
  | 'trash'
  | 'calendar'
  | `folder:${string}`
export const COLOR_LABELS: Record<Color, string> = {
  coral: 'Коралловый',
  amber: 'Янтарный',
  sage: 'Шалфей',
  blue: 'Голубой',
  violet: 'Лавандовый',
  rose: 'Розовый',
}
export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий',
  medium: 'Обычный',
  high: 'Высокий',
}
