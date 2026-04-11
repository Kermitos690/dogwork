/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
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

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://dcwbqsfeouvghcnvhrpj.supabase.co/storage/v1/object/public/email-assets/logo-dogwork.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre code de vérification – Your verification code | DogWork</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={logo} />
        </Section>

        <Heading style={h1}>Code de vérification</Heading>
        <Text style={text}>
          Utilisez le code ci-dessous pour confirmer votre identité :
        </Text>
        <Text style={codeStyle}>{token}</Text>

        <Hr style={divider} />

        <Heading style={h2}>Verification code</Heading>
        <Text style={text}>
          Use the code below to confirm your identity:
        </Text>
        <Text style={codeStyle}>{token}</Text>

        <Hr style={divider} />

        <Text style={footer}>
          Ce code expirera sous peu. Si vous n'avez pas fait cette demande, ignorez cet email.
        </Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.
        </Text>
        <Text style={footerBrand}>
          © DogWork — L'écosystème canin premium
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '560px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '30px' }
const logo = { margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a1a2e', margin: '0 0 16px', lineHeight: '1.3' }
const h2 = { fontSize: '20px', fontWeight: '600' as const, color: '#1a1a2e', margin: '0 0 14px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '28px',
  fontWeight: '700' as const,
  color: '#1a1a2e',
  textAlign: 'center' as const,
  letterSpacing: '4px',
  margin: '0 0 24px',
  padding: '16px',
  backgroundColor: '#f4f4f8',
  borderRadius: '10px',
}
const divider = { borderColor: '#e8e8ee', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.5', margin: '0 0 6px' }
const footerBrand = { fontSize: '12px', color: '#b0b0c0', margin: '20px 0 0', textAlign: 'center' as const }
