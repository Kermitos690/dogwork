/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  triggeredAt?: string
  triggeredBy?: string
  channel?: string
}

const EmailTestDiagnosticEmail = ({ triggeredAt, triggeredBy, channel }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Test de délivrabilité DogWork — {channel || 'Lovable'}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Test de délivrabilité</Heading>
        <Text style={s.text}>
          Cet email confirme que la chaîne d'envoi <strong>{channel || 'Lovable'}</strong>{' '}
          fonctionne de bout en bout : enfilement, queue, dispatcher, fournisseur SMTP,
          domaine signé et boîte de réception.
        </Text>

        <Section style={s.card}>
          <Text style={{ ...s.text, margin: 0 }}>
            <strong>Canal :</strong> {channel || 'Lovable (notify.dogwork-at-home.com)'}<br />
            <strong>Déclenché par :</strong> {triggeredBy || 'admin'}<br />
            <strong>Horodatage :</strong> {triggeredAt || new Date().toISOString()}
          </Text>
        </Section>

        <Text style={s.text}>
          Si vous recevez ce message, l'expéditeur est correctement authentifié
          (SPF, DKIM, DMARC). Inspectez les en-têtes pour vérifier les statuts
          <code> Authentication-Results</code>.
        </Text>

        <Text style={s.footerBrand}>© DogWork — Diagnostic email</Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: EmailTestDiagnosticEmail,
  subject: (data) => `[DogWork] Test délivrabilité — ${data.channel || 'Lovable'}`,
  displayName: 'Email Test Diagnostic',
  previewData: { triggeredBy: 'admin@dogwork', channel: 'Lovable' },
}
