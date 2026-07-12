import * as React from 'react'
import { Html, Preview, Section } from '@react-email/components'
import { BrandLayout, styles, Head, Heading, Text, Hr } from './_brand'

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
    <BrandLayout preview={`طلبك #${orderNumber} جاهز`} lang="ar">
      <Heading style={styles.h1}>✓ تم تسليم طلبك</Heading>
      <Text style={styles.text}>
        شكراً لشرائك من <b style={{ color: '#fff' }}>RapidKeyz</b> 🎉<br />
        رقم الطلب: <span style={styles.mono}>#{orderNumber}</span> — المبلغ: <span style={styles.mono}>{total} {currency}</span>
      </Text>

      <Heading as="h2" style={styles.h2}>بيانات الحسابات</Heading>
      {accounts.map((a, i) => (
        <Section key={i} style={styles.card}>
          <Text style={styles.cardTitle}>
            {a.product_name} <span style={{ color: styles.muted.color, fontWeight: 400 }}>— {a.plan_label}</span>
          </Text>
          {a.account_email && (
            <Text style={styles.line}><b style={{ color: '#fff' }}>البريد:</b> <span style={styles.mono}>{a.account_email}</span></Text>
          )}
          {a.account_username && (
            <Text style={styles.line}><b style={{ color: '#fff' }}>اسم المستخدم:</b> <span style={styles.mono}>{a.account_username}</span></Text>
          )}
          {a.account_password && (
            <Text style={styles.line}><b style={{ color: '#fff' }}>كلمة السر:</b> <span style={styles.mono}>{a.account_password}</span></Text>
          )}
          {a.extra_notes && (
            <Text style={styles.line}><b style={{ color: '#fff' }}>ملاحظات:</b> {a.extra_notes}</Text>
          )}
        </Section>
      ))}

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
