import * as React from 'react'
import { render } from '@react-email/render'
import { TEMPLATES } from './registry'
import { sendResendEmail } from '@/lib/resend'

// Server-only: reads LOVABLE_API_KEY and RESEND_API_KEY. Never import from client components.

const SITE_NAME = 'RapidKeyz'

// The visible From: address. This domain MUST be verified in Resend before
// emails can be sent to users. Override with RESEND_FROM_EMAIL if needed.
const DEFAULT_FROM_EMAIL = 'RapidKeyz <noreply@rapidkeyz.com>'

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL
}

export type SendTemplateEmailResult = { sent: true }

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string
  replyTo?: string
}

/**
 * Renders a registered template and sends it through Resend via the Lovable
 * connector gateway. Throws on failure; a successful send resolves { sent: true }.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {}
): Promise<SendTemplateEmailResult> {
  const template = TEMPLATES[templateName]
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`
    )
  }

  // Template-level `to` takes precedence; notification templates always
  // send to their fixed address.
  const recipient = template.to || to
  if (!recipient) {
    throw new Error('Recipient is required (the template defines no fixed recipient)')
  }

  const templateData = options.templateData ?? {}
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  await sendResendEmail({
    to: recipient,
    from: getFromEmail(),
    subject,
    html,
    text,
    replyTo: options.replyTo,
    idempotencyKey: options.idempotencyKey || crypto.randomUUID(),
  })

  return { sent: true }
}
