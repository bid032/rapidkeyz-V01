import type { ComponentType } from 'react'
import { template as newOrderTemplate } from './new-order'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'new-order': newOrderTemplate,
}
