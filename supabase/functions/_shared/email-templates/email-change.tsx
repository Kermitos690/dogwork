/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

const LOGO_URL = 'https://dogwork-at-home.com/logo-dogwork.png'

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez le changement d'email – Confirm email change | DogWork</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={logo} />
        </Section>

        <Heading style={h1}>Changement d'adresse email</Heading>
        <Text style={text}>
          Vous avez demandé à changer votre adresse email de{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          vers{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          Cliquez sur le bouton ci-dessous pour confirmer.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Confirmer le changement
          </Button>
        </Section>

        <Hr style={divider} />

        <Heading style={h2}>Email address change</Heading>
        <Text style={text}>
          You requested to change your email from{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          Click the button below to confirm this change.
        </Text>
        <Section style={buttonSection}>
          <Button style={buttonSecondary} href={confirmationUrl}>
            Confirm email change
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>
          Si vous n'avez pas demandé ce changement, sécurisez votre compte immédiatement.
        </Text>
        <Text style={footer}>
          If you didn't request this change, please secure your account immediately.
        </Text>
        <Text style={footerBrand}>
          © DogWork — L'écosystème canin premium
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logo = { margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a1a2e', margin: '0 0 16px', lineHeight: '1.3' }
const h2 = { fontSize: '20px', fontWeight: '600' as const, color: '#1a1a2e', margin: '0 0 14px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#3b82f6', textDecoration: 'underline' }
const buttonSection = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = {
  backgroundColor: '#1a1a2e',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const buttonSecondary = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const divider = { borderColor: '#e8e8ee', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.5', margin: '0 0 6px' }
const footerBrand = { fontSize: '12px', color: '#b0b0c0', margin: '20px 0 0', textAlign: 'center' as const }
