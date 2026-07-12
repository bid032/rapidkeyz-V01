import * as React from 'react'
import { Html, Preview, Section } from '@react-email/components'
import { BrandLayout, styles, Head, Heading, Text, Hr } from './_brand'

function looksLikeActivationKey(v?: string | null): boolean {
  if (!v) return false
  const s = v.trim()
  if (!s || s.includes('@') || /\s/.test(s)) return false
  if (/^[A-Z0-9]{4,}(-[A-Z0-9]{4,}){1,}$/i.test(s)) return true
  if (/^[A-Z0-9]{16,}$/.test(s)) return true
  return false
}

interface DeliveredAccount {
  product_name: string
  plan_label: string
  account_email?: string | null
  account_username?: string | null
  account_password?: string | null
  extra_notes?: string | null
}

export interface OrderDeliveredEmailProps {
  orderNumber: string
  total: number
  currency: string
  accounts: DeliveredAccount[]
}

export const OrderDeliveredEmail = ({
  orderNumber, total, currency, accounts,
}: OrderDeliveredEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{`طلبك #${orderNumber} جاهز ، بيانات الحساب في الإيميل`}</Preview>
    <BrandLayout preview={`طلبك #${orderNumber} جاهز`} lang="ar">
      <Heading style={styles.h1}>✓ تم تسليم طلبك</Heading>
      <Text style={styles.text}>
        شكراً لشرائك من <b style={{ color: '#fff' }}>RapidKeyz</b> <br />
        رقم الطلب: <span style={styles.mono}>#{orderNumber}</span> ، المبلغ: <span style={styles.mono}>{total} {currency}</span>
      </Text>

      <Heading as="h2" style={styles.h2}>بيانات الحسابات</Heading>
      {accounts.map((a, i) => {
        const email = a.account_email?.trim()
        const username = a.account_username?.trim()
        const password = a.account_password?.trim()
        const rows: { label: string; value: string }[] = []

        if (!email && username && !password && looksLikeActivationKey(username)) {
          rows.push({ label: 'مفتاح التفعيل', value: username })
        } else if (!email && !username && password && looksLikeActivationKey(password)) {
          rows.push({ label: 'مفتاح التفعيل', value: password })
        } else {
          if (email) rows.push({ label: 'البريد', value: email })
          if (username) rows.push({ label: 'اسم المستخدم', value: username })
          if (password) rows.push({ label: 'كلمة السر', value: password })
        }

        return (
          <Section key={i} style={styles.card}>
            <Text style={styles.cardTitle}>
              {a.product_name} <span style={{ color: styles.muted.color, fontWeight: 400 }}>, {a.plan_label}</span>
            </Text>
            {rows.map((r, ri) => (
              <Text key={ri} style={styles.line}>
                <b style={{ color: '#fff' }}>{r.label}:</b> <span style={styles.mono}>{r.value}</span>
              </Text>
            ))}
            {a.extra_notes && (
              <Text style={styles.line}><b style={{ color: '#fff' }}>ملاحظات:</b> {a.extra_notes}</Text>
            )}
          </Section>
        )
      })}

      <Hr style={styles.hr} />
      <Text style={styles.muted}>
        لو حصل أي مشكلة في الدخول، تواصل معانا على واتساب أو رد على الإيميل ده وهنساعدك فوراً.
      </Text>
    </BrandLayout>
  </Html>
)

export default OrderDeliveredEmail

export const template = {
  component: OrderDeliveredEmail,
  subject: (d: Record<string, any>) => `طلبك #${d.orderNumber} جاهز ، بيانات الحساب`,
  previewData: {
    orderNumber: 'ABC12345',
    total: 1500,
    currency: 'EGP',
    accounts: [
      { product_name: 'Netflix Premium', plan_label: '1 Month', account_email: 'shared@rk.com', account_password: 'secret123', extra_notes: 'استخدم البروفايل الأول فقط' },
    ],
  },
}
