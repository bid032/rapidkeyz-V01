import * as React from 'react'
import { Html, Preview, Button, Section } from '@react-email/components'
import { BrandLayout, styles, Head, Heading, Text } from './_brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <BrandLayout preview={`Reset your password for ${siteName}`} lang="en">
      <Heading style={styles.h1}>Reset your password</Heading>
      <Text style={styles.text}>
        We received a request to reset your password for <b style={{ color: '#fff' }}>{siteName}</b>.
        Click the button below to choose a new password.
      </Text>
      <Section style={{ textAlign: 'center', margin: '18px 0 8px' }}>
        <Button style={styles.button} href={confirmationUrl}>Reset Password</Button>
      </Section>
      <Text style={styles.muted}>
        If you didn't request a password reset, you can safely ignore this email.
      </Text>
    </BrandLayout>
  </Html>
)

export default RecoveryEmail
