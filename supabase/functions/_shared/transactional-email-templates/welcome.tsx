/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  dashboardUrl?: string
}

const WelcomeEmail = ({ name, dashboardUrl }: Props) => {
  const cta = dashboardUrl || `${SITE_URL}/dashboard`
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Bienvenue sur DogWork — votre écosystème canin premium</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.logoSection}>
            <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
          </Section>

          <Heading style={s.h1}>Bienvenue {name ? name : 'sur DogWork'} 🐾</Heading>
          <Text style={s.text}>
            Votre compte est prêt. DogWork vous accompagne pour comprendre, suivre
            et faire progresser votre chien grâce à des plans structurés, des
            exercices guidés et une IA dédiée.
          </Text>

          <Section style={s.cardAccent}>
            <Text style={{ ...s.text, margin: 0 }}>
              <strong>Vos premières étapes :</strong><br />
              1. Ajoutez votre chien et complétez son profil<br />
              2. Réalisez l'évaluation comportementale<br />
              3. Lancez votre premier plan d'éducation
            </Text>
          </Section>

          <Section style={s.buttonSection}>
            <Button style={s.button} href={cta}>Accéder à mon tableau de bord</Button>
          </Section>

          <Hr style={s.divider} />

          <Text style={s.textSmall}>
            Une question ? Notre équipe est là pour vous —{' '}
            <Link href={`${SITE_URL}/help`} style={s.link}>centre d'aide</Link>.
          </Text>
          <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: 'Bienvenue sur DogWork 🐾',
  displayName: 'Bienvenue (compte créé)',
  previewData: { name: 'Marie' },
} satisfies TemplateEntry
