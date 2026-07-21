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
  subtotal?: number | null
  discountAmount?: number | null
  couponCode?: string | null
  currency: string
  accounts: DeliveredAccount[]
  lang?: 'ar' | 'en'
}

export const OrderDeliveredEmail = ({
  orderNumber, total, subtotal, discountAmount, couponCode, currency, accounts, lang = 'ar',
}: OrderDeliveredEmailProps) => {
  const isAr = lang === 'ar'
  const hasCoupon = Number(discountAmount ?? 0) > 0
  const t = {
    preview: isAr
      ? `طلبك #${orderNumber} جاهز ، بيانات الحساب في الإيميل`
      : `Your order #${orderNumber} is ready — account details inside`,
    heading: isAr ? '✓ تم تسليم طلبك' : '✓ Your order has been delivered',
    thanks: isAr ? 'شكراً لشرائك من' : 'Thank you for your purchase from',
    orderNo: isAr ? 'رقم الطلب' : 'Order number',
    amount: isAr ? 'المبلغ' : 'Amount',
    before: isAr ? 'قبل الخصم' : 'Before discount',
    coupon: isAr ? 'كوبون خصم' : 'Coupon',
    discount: isAr ? 'الخصم' : 'Discount',
    accountsHeading: isAr ? 'بيانات الحسابات' : 'Account credentials',
    activationKey: isAr ? 'مفتاح التفعيل' : 'Activation key',
    email: isAr ? 'البريد' : 'Email',
    username: isAr ? 'اسم المستخدم' : 'Username',
    password: isAr ? 'كلمة السر' : 'Password',
    notes: isAr ? 'ملاحظات' : 'Notes',
    openPanel: isAr ? 'افتح لوحة الحساب لنسخ البيانات' : 'Open your dashboard to copy credentials',
    tip: isAr
      ? 'نصيحة: على الموبايل اضغط مطوّلاً على أي قيمة لنسخها فوراً.'
      : 'Tip: on mobile, long-press any value to copy it instantly.',
    support: isAr
      ? 'لو حصل أي مشكلة في الدخول، تواصل معانا على واتساب أو رد على الإيميل ده وهنساعدك فوراً.'
      : "If you run into any login issues, reach out on WhatsApp or reply to this email and we'll help right away.",
  }
  return (
    <Html lang={lang} dir={isAr ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{t.preview}</Preview>
      <BrandLayout preview={t.preview} lang={lang}>
        <Heading style={styles.h1}>{t.heading}</Heading>
        <Text style={styles.text}>
          {t.thanks} <b style={{ color: '#fff' }}>RapidKeyz</b> <br />
          {t.orderNo}: <span style={styles.mono}>#{orderNumber}</span> , {t.amount}: <span style={styles.mono}>{total} {currency}</span>
        </Text>

        {hasCoupon && (
          <Section style={styles.card}>
            {subtotal != null && (
              <Text style={styles.line}>
                <b style={{ color: '#fff' }}>{t.before}:</b>{' '}
                <span style={{ ...styles.mono, textDecoration: 'line-through', opacity: 0.7 }}>{subtotal} {currency}</span>
              </Text>
            )}
            <Text style={styles.line}>
              <b style={{ color: '#fff' }}>🎟️ {t.coupon}:</b>{' '}
              {couponCode && <span style={styles.mono}>{couponCode}</span>}{' '}
              <span style={{ color: '#22c55e', fontWeight: 700 }}>−{discountAmount} {currency}</span>
            </Text>
            <Text style={styles.line}>
              <b style={{ color: '#fff' }}>{t.amount}:</b>{' '}
              <span style={styles.mono}>{total} {currency}</span>
            </Text>
          </Section>
        )}

        <Heading as="h2" style={styles.h2}>{t.accountsHeading}</Heading>
        {accounts.map((a, i) => {
          const email = a.account_email?.trim()
          const username = a.account_username?.trim()
          const password = a.account_password?.trim()
          const rows: { label: string; value: string }[] = []

          if (!email && username && !password && looksLikeActivationKey(username)) {
            rows.push({ label: t.activationKey, value: username })
          } else if (!email && !username && password && looksLikeActivationKey(password)) {
            rows.push({ label: t.activationKey, value: password })
          } else {
            if (email) rows.push({ label: t.email, value: email })
            if (username) rows.push({ label: t.username, value: username })
            if (password) rows.push({ label: t.password, value: password })
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
                <Text style={styles.line}><b style={{ color: '#fff' }}>{t.notes}:</b> {a.extra_notes}</Text>
              )}
            </Section>
          )
        })}

        <Hr style={styles.hr} />
        <Section style={{ textAlign: 'center' as const }}>
          <a
            href="https://rapidkeyz.lovable.app/dashboard"
            style={{ ...styles.button, display: 'inline-block' }}
          >
            {t.openPanel}
          </a>
        </Section>
        <Text style={{ ...styles.muted, textAlign: 'center' as const, marginTop: '10px' }}>
          {t.tip}
        </Text>
        <Hr style={styles.hr} />
        <Text style={styles.muted}>{t.support}</Text>
      </BrandLayout>
    </Html>
  )
}

export default OrderDeliveredEmail

export const template = {
  component: OrderDeliveredEmail,
  subject: (d: Record<string, any>) =>
    d.lang === 'en'
      ? `Your order #${d.orderNumber} is ready — account details`
      : `طلبك #${d.orderNumber} جاهز ، بيانات الحساب`,
  previewData: {
    orderNumber: 'ABC12345',
    total: 1500,
    currency: 'EGP',
    lang: 'ar',
    accounts: [
      { product_name: 'Netflix Premium', plan_label: '1 Month', account_email: 'shared@rk.com', account_password: 'secret123', extra_notes: 'استخدم البروفايل الأول فقط' },
    ],
  },
}
