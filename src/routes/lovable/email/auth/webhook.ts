import * as React from 'react'
import { createAuthEmailHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail } from '@/lib/email-templates/signup'
import { InviteEmail } from '@/lib/email-templates/invite'
import { MagicLinkEmail } from '@/lib/email-templates/magic-link'
import { RecoveryEmail } from '@/lib/email-templates/recovery'
import { EmailChangeEmail } from '@/lib/email-templates/email-change'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "RapidKeyz"
const SENDER_DOMAIN = "info.rapidkeyz.com"
const ROOT_DOMAIN = "rapidkeyz.com"
const FROM_DOMAIN = "rapidkeyz.com"
const SITE_URL = `https://${ROOT_DOMAIN}`

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
const handler = createAuthEmailHandler({
  apiKey: process.env.LOVABLE_API_KEY!,
  from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
  senderDomain: SENDER_DOMAIN,
  sendUrl: process.env.LOVABLE_SEND_URL,
  emails: {
    signup: {
      subject: "أكد بريدك الإلكتروني",
      render: (data) => {
        const lang = pickLang(data)
        return React.createElement(SignupEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          recipient: data.email,
          confirmationUrl: data.url,
          lang,
        })
      },
    },
    invite: {
      subject: "تمت دعوتك",
      render: (data) => {
        const lang = pickLang(data)
        return React.createElement(InviteEmail, {
          siteName: SITE_NAME,
          siteUrl: SITE_URL,
          confirmationUrl: data.url,
          lang,
        })
      },
    },
    magiclink: {
      subject: "رابط الدخول",
      render: (data) => {
        const lang = pickLang(data)
        return React.createElement(MagicLinkEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
          lang,
        })
      },
    },
    recovery: {
      subject: "إعادة تعيين كلمة السر",
      render: (data) => {
        const lang = pickLang(data)
        return React.createElement(RecoveryEmail, {
          siteName: SITE_NAME,
          confirmationUrl: data.url,
          lang,
        })
      },
    },
    email_change: {
      subject: "تأكيد البريد الجديد",
      render: (data) => {
        const lang = pickLang(data)
        return React.createElement(EmailChangeEmail, {
          siteName: SITE_NAME,
          oldEmail: data.old_email ?? '',
          email: data.email,
          newEmail: data.new_email ?? '',
          confirmationUrl: data.url,
          lang,
        })
      },
    },
    reauthentication: {
      subject: "رمز التحقق",
      render: (data) => {
        const lang = pickLang(data)
        return React.createElement(ReauthenticationEmail, { token: data.token ?? '', lang })
      },
    },
  },
})

// Extract preferred language from Supabase user metadata; default to Arabic.
function pickLang(data: any): 'ar' | 'en' {
  const raw =
    data?.user?.user_metadata?.language ??
    data?.user?.user_metadata?.locale ??
    data?.user_metadata?.language ??
    data?.metadata?.language
  if (typeof raw === 'string' && raw.toLowerCase().startsWith('en')) return 'en'
  return 'ar'
}

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handler(request),
    },
  },
})
