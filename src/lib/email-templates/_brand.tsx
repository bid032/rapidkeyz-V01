import * as React from 'react'
import {
  Body, Container, Head, Heading, Section, Text, Hr,
} from '@react-email/components'

// Shared brand tokens for all RapidKeyz emails.
// Body background MUST stay #ffffff (email standard). Inner card uses navy.
export const brand = {
  primary: '#22c3e6',       // cyan brand
  primaryDark: '#0f96b8',
  navy: '#0f172a',          // deep navy card
  navySoft: '#1e293b',
  border: 'rgba(34,195,230,0.25)',
  softBorder: 'rgba(148,163,184,0.25)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  bodyBg: '#ffffff',
  pageBg: '#f1f5f9',
}

export const styles = {
  main: {
    backgroundColor: brand.bodyBg,
    fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
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
    fontSize: '22px',
    fontWeight: 800 as const,
    color: '#ffffff',
    letterSpacing: '0.5px',
    margin: 0,
  },
  logoAccent: { color: brand.primary },
  tagline: {
    color: brand.textMuted,
    fontSize: '12px',
    margin: '4px 0 0',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
  },
  body: { padding: '28px 28px 8px' },
  h1: {
    fontSize: '22px',
    fontWeight: 800 as const,
    color: '#ffffff',
    margin: '0 0 14px',
  },
  h2: {
    fontSize: '15px',
    fontWeight: 700 as const,
    color: brand.primary,
    margin: '18px 0 10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  text: {
    fontSize: '14px',
    color: brand.text,
    lineHeight: '1.75',
    margin: '0 0 12px',
  },
  muted: {
    fontSize: '12px',
    color: brand.textMuted,
    lineHeight: '1.6',
    margin: '0',
  },
  card: {
    padding: '16px 18px',
    border: `1px solid ${brand.border}`,
    borderRadius: '12px',
    marginBottom: '12px',
    backgroundColor: 'rgba(34,195,230,0.06)',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 700 as const,
    color: '#ffffff',
    margin: '0 0 10px',
  },
  line: {
    fontSize: '13px',
    color: brand.text,
    margin: '4px 0',
    lineHeight: '1.6',
  },
  mono: {
    fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    backgroundColor: '#020617',
    color: brand.primary,
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12.5px',
    border: `1px solid ${brand.border}`,
  },
  button: {
    display: 'inline-block',
    backgroundColor: brand.primary,
    color: brand.navy,
    fontSize: '14px',
    fontWeight: 800 as const,
    borderRadius: '10px',
    padding: '13px 26px',
    textDecoration: 'none',
    boxShadow: `0 8px 20px -8px ${brand.primary}`,
  },
  hr: {
    borderColor: brand.softBorder,
    margin: '20px 0',
  },
  footer: {
    padding: '18px 28px 24px',
    borderTop: `1px solid ${brand.softBorder}`,
    textAlign: 'center' as const,
    backgroundColor: brand.navySoft,
  },
  footerText: {
    fontSize: '11px',
    color: brand.textMuted,
    margin: 0,
    lineHeight: '1.6',
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

export const BrandLayout = ({ preview, lang = 'ar', children }: LayoutProps) => {
  const isAr = lang === 'ar'
  return (
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.header}>
          <Heading style={styles.logo}>
            Rapid<span style={styles.logoAccent}>Keyz</span>
          </Heading>
          <Text style={styles.tagline}>
            {isAr ? 'الاشتراكات الرقمية الأسرع' : 'Fastest Digital Subscriptions'}
          </Text>
        </Section>
        <Section style={styles.body}>{children}</Section>
        <Section style={styles.footer}>
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
