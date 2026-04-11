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
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://dcwbqsfeouvghcnvhrpj.supabase.co/storage/v1/object/public/email-assets/logo-dogwork.png'

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre lien de connexion – Your login link | DogWork</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={logo} />
        </Section>

        <Heading style={h1}>Votre lien de connexion</Heading>
        <Text style={text}>
          Cliquez sur le bouton ci-dessous pour vous connecter à {siteName}.
          Ce lien expirera sous peu.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Se connecter
          </Button>
        </Section>

        <Hr style={divider} />

        <Heading style={h2}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to {siteName}.
          This link will expire shortly.
        </Text>
        <Section style={buttonSection}>
          <Button style={buttonSecondary} href={confirmationUrl}>
            Log in
          </Button>
        </Section>

        <Hr style={divider} />

        <Text style={footer}>
          Si vous n'avez pas demandé ce lien, ignorez simplement cet email.
        </Text>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
        <Text style={footerBrand}>
          © DogWork — L'écosystème canin premium
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logo = { margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a1a2e', margin: '0 0 16px', lineHeight: '1.3' }
const h2 = { fontSize: '20px', fontWeight: '600' as const, color: '#1a1a2e', margin: '0 0 14px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 20px' }
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
