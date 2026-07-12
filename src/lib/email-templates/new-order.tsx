import * as React from 'react'
import {
  Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'

interface Item {
  product_name: string
  plan_label: string
  quantity: number
  unit_price: number
  delivery_type: string
  subscription_email?: string | null
}

export interface NewOrderEmailProps {
  orderNumber: string
  total: number
  currency: string
  customerEmail: string
  customerPhone?: string | null
  paymentGateway: string
  paymentSenderPhone?: string | null
  paymentProofUrl?: string | null
  items: Item[]
  adminUrl: string
}

export const NewOrderEmail = ({
  orderNumber, total, currency, customerEmail, customerPhone,
  paymentGateway, paymentSenderPhone, paymentProofUrl, items, adminUrl,
}: NewOrderEmailProps) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{`طلب جديد #${orderNumber} — ${total} ${currency}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>طلب جديد #{orderNumber}</Heading>
        <Text style={text}>
          <b>المبلغ:</b> {total} {currency}<br />
          <b>طريقة الدفع:</b> {paymentGateway}<br />
          <b>العميل:</b> {customerEmail}{customerPhone ? ` — ${customerPhone}` : ''}
          {paymentSenderPhone ? <><br /><b>رقم المحفظة المُحوَّل منه:</b> {paymentSenderPhone}</> : null}
          {paymentProofUrl ? <><br /><b>إثبات الدفع:</b> {paymentProofUrl}</> : null}
        </Text>
        <Hr />
        <Section>
          {items.map((it, i) => (
            <Text key={i} style={text}>
              • {it.product_name} — {it.plan_label} × {it.quantity} — {it.unit_price} {currency}
              {' '}<span style={{ color: '#888' }}>({it.delivery_type})</span>
              {it.subscription_email ? <><br />&nbsp;&nbsp;تفعيل على: {it.subscription_email}</> : null}
            </Text>
          ))}
        </Section>
        <Hr />
        <Text style={text}>
          <Link href={adminUrl} style={link}>فتح لوحة الطلبات</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default NewOrderEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#000', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#333', lineHeight: '1.6', margin: '0 0 12px' }
const link = { color: '#0066cc', textDecoration: 'underline' }

export const template = {
  component: NewOrderEmail,
  subject: (d: Record<string, any>) => `طلب جديد #${d.orderNumber} — ${d.total} ${d.currency}`,
  to: 'bidotito1@gmail.com',
  previewData: {
    orderNumber: 'ABC12345',
    total: 1500,
    currency: 'EGP',
    customerEmail: 'customer@example.com',
    customerPhone: '01000000000',
    paymentGateway: 'wallet_instapay',
    paymentSenderPhone: '01111111111',
    paymentProofUrl: 'https://example.com/proof.jpg',
    items: [
      { product_name: 'Netflix', plan_label: '1 Month', quantity: 1, unit_price: 1500, delivery_type: 'manual', subscription_email: 'user@gmail.com' },
    ],
    adminUrl: 'https://example.com/admin/orders',
  },
}
