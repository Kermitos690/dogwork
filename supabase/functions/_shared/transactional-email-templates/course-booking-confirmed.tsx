/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  courseTitle?: string
  educatorName?: string
  sessionDate?: string
  location?: string
  amount?: string
}

const CourseBookingConfirmedEmail = ({
  name, courseTitle, educatorName, sessionDate, location, amount,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réservation confirmée — DogWork</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Réservation confirmée 🐶</Heading>
        <Text style={s.text}>
          {name ? `Bonjour ${name},` : 'Bonjour,'} votre place est réservée.
          Voici le récapitulatif de votre cours.
        </Text>

        <Section style={s.card}>
          {courseTitle && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Cours :</strong> {courseTitle}
            </Text>
          )}
          {educatorName && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Éducateur :</strong> {educatorName}
            </Text>
          )}
          {sessionDate && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Date :</strong> {sessionDate}
            </Text>
          )}
          {location && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Lieu :</strong> {location}
            </Text>
          )}
          {amount && (
            <Text style={{ ...s.text, margin: 0 }}>
              <strong>Montant :</strong> {amount}
            </Text>
          )}
        </Section>

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/courses`}>Voir mes réservations</Button>
        </Section>

        <Text style={s.textSmall}>
          Un rappel vous sera envoyé avant le début de la séance.
        </Text>
        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: CourseBookingConfirmedEmail,
  subject: 'Votre cours DogWork est réservé',
  displayName: 'Réservation cours confirmée',
  previewData: {
    name: 'Marie', courseTitle: 'Marche en laisse — niveau 1',
    educatorName: 'Julien R.', sessionDate: 'Sam. 26 avr. — 10h00',
    location: 'Parc des Bastions, Genève', amount: '45,00 CHF',
  },
} satisfies TemplateEntry
