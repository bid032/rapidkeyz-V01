import * as React from 'react'
import { Html, Preview } from '@react-email/components'
import { BrandLayout, styles, Head, Heading, Text } from './_brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <BrandLayout preview="Your verification code" lang="en">
      <Heading style={styles.h1}>Confirm reauthentication</Heading>
      <Text style={styles.text}>Use the code below to confirm your identity:</Text>
      <Text style={{
        fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        fontSize: '28px',
        fontWeight: 800 as const,
        color: styles.h2.color,
        letterSpacing: '6px',
        textAlign: 'center' as const,
        padding: '18px',
        backgroundColor: '#020617',
        borderRadius: '12px',
        border: `1px solid ${styles.card.border}`,
        margin: '10px 0 20px',
      }}>{token}</Text>
      <Text style={styles.muted}>
        This code will expire shortly. If you didn't request this, you can safely ignore this email.
      </Text>
    </BrandLayout>
  </Html>
)

export default ReauthenticationEmail
