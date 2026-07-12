import * as React from 'react'
import { Html, Preview, Link, Section, Button } from '@react-email/components'
import { BrandLayout, styles, Head, Heading, Text } from './_brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName, siteUrl, recipient, confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for {siteName}</Preview>
    <BrandLayout preview={`Confirm your email for ${siteName}`} lang="en">
      <Heading style={styles.h1}>Confirm your email</Heading>
      <Text style={styles.text}>
        Thanks for signing up for{' '}
        <Link href={siteUrl} style={styles.link}><strong>{siteName}</strong></Link>!
      </Text>
      <Text style={styles.text}>
        Please confirm your address (<span style={styles.mono}>{recipient}</span>) by clicking below:
      </Text>
      <Section style={{ textAlign: 'center', margin: '18px 0 8px' }}>
        <Button style={styles.button} href={confirmationUrl}>Verify Email</Button>
      </Section>
      <Text style={styles.muted}>
        If you didn't create an account, you can safely ignore this email.
      </Text>
    </BrandLayout>
  </Html>
)

export default SignupEmail
