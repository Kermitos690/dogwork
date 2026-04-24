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
}

const PaymentFailedEmail = ({ name, planLabel, amount }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Action requise — paiement DogWork échoué</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Paiement non abouti</Heading>
        <Text style={s.text}>
          {name ? `Bonjour ${name},` : 'Bonjour,'} nous n'avons pas pu prélever
          le paiement de votre abonnement{planLabel ? ` ${planLabel}` : ''}
          {amount ? ` (${amount})` : ''}.
        </Text>

        <Section style={s.cardAccent}>
          <Text style={{ ...s.text, margin: 0 }}>
            Pour conserver l'accès à vos fonctionnalités, mettez à jour votre
            moyen de paiement dans les prochains jours.
          </Text>
        </Section>

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/subscription`}>Mettre à jour mon paiement</Button>
        </Section>

        <Text style={s.textSmall}>
          Si vous pensez qu'il s'agit d'une erreur, contactez notre support.
        </Text>
        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentFailedEmail,
  subject: 'Action requise : paiement DogWork échoué',
  displayName: 'Paiement échoué',
  previewData: { name: 'Marie', planLabel: 'Pro', amount: '9,90 CHF' },
} satisfies TemplateEntry
