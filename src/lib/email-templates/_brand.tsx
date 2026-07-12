import * as React from 'react'
import {
  Body, Container, Head, Heading, Section, Text, Hr,
} from '@react-email/components'

// Shared brand tokens for all RapidKeyz emails.
// Body background MUST stay #ffffff (email standard). Inner card uses navy.
export const brand = {
  primary: '#22c3e6',
  primaryDark: '#0f96b8',
  navy: '#0f172a',
  navySoft: '#1e293b',
  border: 'rgba(34,195,230,0.28)',
  softBorder: 'rgba(148,163,184,0.22)',
  text: '#e2e8f0',
  textStrong: '#ffffff',
  textMuted: '#94a3b8',
  bodyBg: '#ffffff',
}

const fontStack = '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif'

export const styles = {
  main: {
    backgroundColor: brand.bodyBg,
    fontFamily: fontStack,
    margin: 0,
    padding: '24px 12px',
  } as const,
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: brand.navy,
    borderRadius: '16px',
    overflow: 'hidden',
    border: `1px solid ${brand.border}`,
    boxShadow: '0 12px 40px -12px rgba(15,23,42,0.35)',
  } as const,
  header: {
    background: `linear-gradient(135deg, ${brand.navy} 0%, ${brand.navySoft} 60%, ${brand.primaryDark} 140%)`,
    padding: '28px 28px 22px',
    borderBottom: `1px solid ${brand.border}`,
    textAlign: 'center' as const,
  },
  logo: {
    display: 'inline-block',
    fontSize: '24px',
    fontWeight: 800 as const,
    color: '#ffffff',
    letterSpacing: '0.5px',
    margin: 0,
    fontFamily: fontStack,
  },
  logoAccent: { color: brand.primary },
  tagline: {
    color: brand.textMuted,
    fontSize: '12px',
    margin: '6px 0 0',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    fontFamily: fontStack,
  },
  body: { padding: '28px 28px 12px' },
  h1: {
    fontSize: '22px',
    fontWeight: 800 as const,
    color: brand.textStrong,
    margin: '0 0 16px',
    lineHeight: '1.4',
    fontFamily: fontStack,
  },
  h2: {
    fontSize: '14px',
    fontWeight: 700 as const,
    color: brand.primary,
    margin: '22px 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
    fontFamily: fontStack,
  },
  text: {
    fontSize: '15px',
    color: brand.text,
    lineHeight: '1.85',
    margin: '0 0 14px',
    fontFamily: fontStack,
  },
  muted: {
    fontSize: '12.5px',
    color: brand.textMuted,
    lineHeight: '1.7',
    margin: '0',
    fontFamily: fontStack,
  },
  card: {
    padding: '18px 20px',
    border: `1px solid ${brand.border}`,
    borderRadius: '12px',
    marginBottom: '12px',
    backgroundColor: 'rgba(34,195,230,0.06)',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 700 as const,
    color: brand.textStrong,
    margin: '0 0 10px',
    fontFamily: fontStack,
  },
  line: {
    fontSize: '13.5px',
    color: brand.text,
    margin: '6px 0',
    lineHeight: '1.7',
    fontFamily: fontStack,
  },
  mono: {
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    backgroundColor: '#020617',
    color: brand.primary,
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12.5px',
    border: `1px solid ${brand.border}`,
    display: 'inline-block',
    direction: 'ltr' as const,
    unicodeBidi: 'isolate' as const,
  },
  button: {
    display: 'inline-block',
    backgroundColor: brand.primary,
    color: brand.navy,
    fontSize: '14px',
    fontWeight: 800 as const,
    borderRadius: '10px',
    padding: '14px 28px',
    textDecoration: 'none',
    boxShadow: `0 8px 20px -8px ${brand.primary}`,
    fontFamily: fontStack,
  },
  hr: {
    borderColor: brand.softBorder,
    margin: '22px 0',
  },
  footer: {
    padding: '20px 28px 26px',
    borderTop: `1px solid ${brand.softBorder}`,
    textAlign: 'center' as const,
    backgroundColor: brand.navySoft,
  },
  footerText: {
    fontSize: '11.5px',
    color: brand.textMuted,
    margin: 0,
    lineHeight: '1.7',
    fontFamily: fontStack,
  },
  link: {
    color: brand.primary,
    textDecoration: 'underline',
  },
}

interface LayoutProps {
  preview: string
  lang?: 'ar' | 'en'
  children: React.ReactNode
}

export const BrandLayout = ({ lang = 'ar', children }: LayoutProps) => {
  const isAr = lang === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'
  const dirStyle = { direction: dir as 'rtl' | 'ltr', textAlign: (isAr ? 'right' : 'left') as 'right' | 'left' }
  return (
    <Body style={{ ...styles.main, ...dirStyle }} dir={dir}>
      <Container style={{ ...styles.container, ...dirStyle }} dir={dir}>
        <Section style={{ ...styles.header, textAlign: 'center' }} dir={dir}>
          <Heading style={styles.logo}>
            Rapid<span style={styles.logoAccent}>Keyz</span>
          </Heading>
          <Text style={styles.tagline}>
            {isAr ? 'الاشتراكات الرقمية الأسرع' : 'Fastest Digital Subscriptions'}
          </Text>
        </Section>
        <Section style={{ ...styles.body, ...dirStyle }} dir={dir}>{children}</Section>
        <Section style={{ ...styles.footer, textAlign: 'center' }} dir={dir}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} RapidKeyz —{' '}
            {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
          </Text>
        </Section>
      </Container>
    </Body>
  )
}

export { Head, Heading, Section, Text, Hr }
