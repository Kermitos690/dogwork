/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  packLabel?: string
  credits?: number
  amount?: string
  newBalance?: number
}

const CreditsPurchasedEmail = ({ name, packLabel, credits, amount, newBalance }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vos crédits IA DogWork ont été ajoutés</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Crédits IA ajoutés ✨</Heading>
        <Text style={s.text}>
          {name ? `Merci ${name} !` : 'Merci !'} Votre achat est confirmé et vos
          crédits sont disponibles immédiatement.
        </Text>

        <Section style={s.card}>
          {packLabel && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Pack :</strong> {packLabel}
            </Text>
          )}
          {typeof credits === 'number' && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Crédits ajoutés :</strong> +{credits}
            </Text>
          )}
          {amount && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Montant :</strong> {amount}
            </Text>
          )}
          {typeof newBalance === 'number' && (
            <Text style={{ ...s.text, margin: 0 }}>
              <strong>Nouveau solde :</strong> {newBalance} crédits
            </Text>
          )}
        </Section>

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/shop`}>Voir mon solde</Button>
        </Section>

        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CreditsPurchasedEmail,
  subject: 'Vos crédits IA DogWork sont disponibles',
  displayName: 'Achat de crédits IA',
  previewData: { name: 'Marie', packLabel: 'Pack 150', credits: 150, amount: '14,90 CHF', newBalance: 187 },
} satisfies TemplateEntry
