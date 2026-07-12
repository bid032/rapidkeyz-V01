import * as React from 'react'
import { Html, Preview, Button, Section } from '@react-email/components'
import { BrandLayout, styles, Head, Heading, Text } from './_brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your login link for {siteName}</Preview>
    <BrandLayout preview={`Your login link for ${siteName}`} lang="en">
      <Heading style={styles.h1}>Your login link</Heading>
      <Text style={styles.text}>
        Click the button below to log in to <b style={{ color: '#fff' }}>{siteName}</b>. This link will expire shortly.
      </Text>
      <Section style={{ textAlign: 'center', margin: '18px 0 8px' }}>
        <Button style={styles.button} href={confirmationUrl}>Log In</Button>
      </Section>
      <Text style={styles.muted}>
        If you didn't request this link, you can safely ignore this email.
      </Text>
    </BrandLayout>
  </Html>
)

export default MagicLinkEmail
