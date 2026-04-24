/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  animalName?: string
  weekNumber?: number
  dueDate?: string
}

const AdoptionCheckinDueEmail = ({ name, animalName, weekNumber, dueDate }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Check-in post-adoption à compléter — DogWork</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Comment se passe l'adoption ?</Heading>
        <Text style={s.text}>
          {name ? `Bonjour ${name},` : 'Bonjour,'} il est temps de partager des
          nouvelles {animalName ? `de ${animalName}` : 'de votre compagnon'}
          {weekNumber ? ` (semaine ${weekNumber})` : ''}. Ce point régulier aide
          le refuge à vous accompagner au mieux.
        </Text>

        {dueDate && (
          <Section style={s.cardAccent}>
            <Text style={{ ...s.text, margin: 0 }}>
              <strong>À compléter avant :</strong> {dueDate}
            </Text>
          </Section>
        )}

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/adoption-checkins`}>Compléter mon check-in</Button>
        </Section>

        <Text style={s.textSmall}>
          Quelques minutes suffisent — comportement, santé, moments forts.
        </Text>
        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdoptionCheckinDueEmail,
  subject: 'Votre check-in post-adoption vous attend',
  displayName: 'Check-in post-adoption',
  previewData: { name: 'Marie', animalName: 'Maya', weekNumber: 4, dueDate: '30 avril 2026' },
} satisfies TemplateEntry
