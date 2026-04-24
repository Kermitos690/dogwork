/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  subject?: string
}

const ContactConfirmationEmail = ({ name, subject }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nous avons bien reçu votre message — DogWork</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>
          {name ? `Merci ${name},` : 'Merci de nous avoir contactés'}
        </Heading>
        <Text style={s.text}>
          Nous avons bien reçu votre message{subject ? ` concernant « ${subject} »` : ''}.
          Notre équipe vous répondra dans les meilleurs délais (sous 24 à 48h
          ouvrées).
        </Text>

        <Section style={s.card}>
          <Text style={{ ...s.text, margin: 0 }}>
            En attendant, vous pouvez consulter notre centre d'aide ou explorer
            les ressources DogWork directement depuis l'application.
          </Text>
        </Section>

        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'Nous avons bien reçu votre message',
  displayName: 'Confirmation contact',
  previewData: { name: 'Marie', subject: 'Question abonnement' },
} satisfies TemplateEntry
