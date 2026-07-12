import * as React from 'react'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'

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
    <Preview>{`طلبك #${orderNumber} جاهز — بيانات الحساب في الإيميل`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>تم تسليم طلبك ✓</Heading>
        <Text style={text}>
          شكراً لشرائك من <b>RapidKeyz</b>.<br />
          رقم الطلب: <b>#{orderNumber}</b> — المبلغ: <b>{total} {currency}</b>
        </Text>
        <Hr />
        <Heading as="h2" style={h2}>بيانات الحسابات:</Heading>
        {accounts.map((a, i) => (
          <Section key={i} style={card}>
            <Text style={cardTitle}>
              {a.product_name} — <span style={{ color: '#666', fontWeight: 400 }}>{a.plan_label}</span>
            </Text>
            {a.account_email && (
              <Text style={line}><b>البريد:</b> <span style={mono}>{a.account_email}</span></Text>
            )}
            {a.account_username && (
              <Text style={line}><b>اسم المستخدم:</b> <span style={mono}>{a.account_username}</span></Text>
            )}
            {a.account_password && (
              <Text style={line}><b>كلمة السر:</b> <span style={mono}>{a.account_password}</span></Text>
            )}
            {a.extra_notes && (
              <Text style={line}><b>ملاحظات:</b> {a.extra_notes}</Text>
            )}
          </Section>
        ))}
        <Hr />
        <Text style={{ ...text, fontSize: '12px', color: '#888' }}>
          لو حصل أي مشكلة في الدخول، تواصل معانا على واتساب أو رد على الإيميل ده.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default OrderDeliveredEmail

const main = { backgroundColor: '#f6f8fb', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '600px', margin: '0 auto', backgroundColor: '#fff' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f766e', margin: '0 0 16px' }
const h2 = { fontSize: '16px', fontWeight: 'bold' as const, color: '#111', margin: '18px 0 10px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.7', margin: '0 0 12px' }
const card = { padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: '10px', marginBottom: '10px', backgroundColor: '#fafafa' }
const cardTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#111', margin: '0 0 8px' }
const line = { fontSize: '13px', color: '#333', margin: '2px 0', lineHeight: '1.5' }
const mono = { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', backgroundColor: '#eef2ff', padding: '1px 6px', borderRadius: '4px' }

export const template = {
  component: OrderDeliveredEmail,
  subject: (d: Record<string, any>) => `طلبك #${d.orderNumber} جاهز — بيانات الحساب`,
  previewData: {
    orderNumber: 'ABC12345',
    total: 1500,
    currency: 'EGP',
    accounts: [
      { product_name: 'Netflix Premium', plan_label: '1 Month', account_email: 'shared@rk.com', account_password: 'secret123', extra_notes: 'استخدم البروفايل الأول فقط' },
    ],
  },
}
