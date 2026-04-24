/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  planLabel?: string
  amount?: string
  nextRenewalDate?: string
}

const SubscriptionActivatedEmail = ({ name, planLabel, amount, nextRenewalDate }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre abonnement DogWork est actif</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Votre abonnement est actif ✅</Heading>
        <Text style={s.text}>
          {name ? `Merci ${name} !` : 'Merci !'} Votre plan{' '}
          <span style={s.badge}>{planLabel || 'DogWork'}</span> est désormais activé.
        </Text>

        <Section style={s.card}>
          {amount && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Montant :</strong> {amount}
            </Text>
          )}
          {nextRenewalDate && (
            <Text style={{ ...s.text, margin: 0 }}>
              <strong>Prochain renouvellement :</strong> {nextRenewalDate}
            </Text>
          )}
        </Section>

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/dashboard`}>Accéder à DogWork</Button>
        </Section>

        <Text style={s.textSmall}>
          Vous pouvez gérer ou résilier votre abonnement à tout moment depuis
          votre espace abonnement.
        </Text>
        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionActivatedEmail,
  subject: 'Votre abonnement DogWork est actif',
  displayName: 'Abonnement activé',
  previewData: { name: 'Marie', planLabel: 'Pro', amount: '9,90 CHF / mois', nextRenewalDate: '24 mai 2026' },
} satisfies TemplateEntry
