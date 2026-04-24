/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  title?: string
  startAt?: string
  location?: string
  withWho?: string
}

const AppointmentReminderEmail = ({ name, title, startAt, location, withWho }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Rappel — votre rendez-vous DogWork approche</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Rappel de rendez-vous ⏰</Heading>
        <Text style={s.text}>
          {name ? `Bonjour ${name},` : 'Bonjour,'} ceci est un rappel de votre
          prochain rendez-vous DogWork.
        </Text>

        <Section style={s.card}>
          {title && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Objet :</strong> {title}
            </Text>
          )}
          {startAt && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Quand :</strong> {startAt}
            </Text>
          )}
          {withWho && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Avec :</strong> {withWho}
            </Text>
          )}
          {location && (
            <Text style={{ ...s.text, margin: 0 }}>
              <strong>Lieu :</strong> {location}
            </Text>
          )}
        </Section>

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/dashboard`}>Voir mon agenda</Button>
        </Section>

        <Text style={s.textSmall}>
          Besoin de modifier ce rendez-vous ? Rendez-vous dans votre espace DogWork.
        </Text>
        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AppointmentReminderEmail,
  subject: 'Rappel : votre rendez-vous DogWork',
  displayName: 'Rappel rendez-vous',
  previewData: {
    name: 'Marie', title: 'Séance individuelle',
    startAt: 'Demain à 10h00', withWho: 'Julien R.',
    location: 'Parc des Bastions, Genève',
  },
} satisfies TemplateEntry
