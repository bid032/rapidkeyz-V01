import * as React from 'react'
import { Html, Preview, Link, Button, Section } from '@react-email/components'
import { BrandLayout, styles, Head, Heading, Text } from './_brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <BrandLayout preview={`You've been invited to join ${siteName}`} lang="en">
      <Heading style={styles.h1}>You've been invited</Heading>
      <Text style={styles.text}>
        You've been invited to join{' '}
        <Link href={siteUrl} style={styles.link}><strong>{siteName}</strong></Link>.
        Click the button below to accept and create your account.
      </Text>
      <Section style={{ textAlign: 'center', margin: '18px 0 8px' }}>
        <Button style={styles.button} href={confirmationUrl}>Accept Invitation</Button>
      </Section>
      <Text style={styles.muted}>
        If you weren't expecting this invitation, you can safely ignore this email.
      </Text>
    </BrandLayout>
  </Html>
)

export default InviteEmail
