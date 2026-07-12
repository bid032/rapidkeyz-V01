import * as React from 'react'
import { Html, Preview, Link, Button, Section } from '@react-email/components'
import { BrandLayout, styles, Head, Heading, Text } from './_brand'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName, oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for {siteName}</Preview>
    <BrandLayout preview={`Confirm your email change for ${siteName}`} lang="en">
      <Heading style={styles.h1}>Confirm your email change</Heading>
      <Text style={styles.text}>
        You requested to change your email address for <b style={{ color: '#fff' }}>{siteName}</b> from{' '}
        <Link href={`mailto:${oldEmail}`} style={styles.link}>{oldEmail}</Link>{' '}to{' '}
        <Link href={`mailto:${newEmail}`} style={styles.link}>{newEmail}</Link>.
      </Text>
      <Text style={styles.text}>Click the button below to confirm this change:</Text>
      <Section style={{ textAlign: 'center', margin: '18px 0 8px' }}>
        <Button style={styles.button} href={confirmationUrl}>Confirm Email Change</Button>
      </Section>
      <Text style={styles.muted}>
        If you didn't request this change, please secure your account immediately.
      </Text>
    </BrandLayout>
  </Html>
)

export default EmailChangeEmail
