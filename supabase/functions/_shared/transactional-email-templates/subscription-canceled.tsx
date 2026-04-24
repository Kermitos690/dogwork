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
  endsOn?: string
}

const SubscriptionCanceledEmail = ({ name, planLabel, endsOn }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre abonnement DogWork a été résilié</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Résiliation enregistrée</Heading>
        <Text style={s.text}>
          {name ? `Bonjour ${name},` : 'Bonjour,'} la résiliation de votre
          abonnement <strong>{planLabel || 'DogWork'}</strong> a bien été prise
          en compte.
        </Text>

        {endsOn && (
          <Section style={s.cardAccent}>
            <Text style={{ ...s.text, margin: 0 }}>
              Vous conservez l'accès à toutes les fonctionnalités jusqu'au{' '}
              <strong>{endsOn}</strong>.
            </Text>
          </Section>
        )}

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/subscription`}>Gérer mon abonnement</Button>
        </Section>

        <Text style={s.textSmall}>
          Vous changez d'avis ? Vous pouvez réactiver votre abonnement à tout moment.
        </Text>
        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionCanceledEmail,
  subject: 'Votre abonnement DogWork a été résilié',
  displayName: 'Abonnement résilié',
  previewData: { name: 'Marie', planLabel: 'Pro', endsOn: '24 mai 2026' },
} satisfies TemplateEntry
