/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  shelterName?: string
  loginEmail?: string
  temporaryPassword?: string
}

const EmployeeCredentialsEmail = ({ name, shelterName, loginEmail, temporaryPassword }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Vos identifiants employé DogWork</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Bienvenue dans l'équipe</Heading>
        <Text style={s.text}>
          {name ? `Bonjour ${name},` : 'Bonjour,'}{' '}
          {shelterName ? `${shelterName} vous a` : 'Vous avez été'} ajouté(e)
          comme membre de l'équipe sur DogWork.
        </Text>

        <Section style={s.card}>
          {loginEmail && (
            <Text style={{ ...s.text, margin: '0 0 6px' }}>
              <strong>Identifiant :</strong> {loginEmail}
            </Text>
          )}
          {temporaryPassword && (
            <Text style={{ ...s.text, margin: 0 }}>
              <strong>Mot de passe temporaire :</strong>{' '}
              <code style={{ backgroundColor: '#fff', padding: '2px 6px', borderRadius: '6px' }}>
                {temporaryPassword}
              </code>
            </Text>
          )}
        </Section>

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/auth`}>Se connecter</Button>
        </Section>

        <Hr style={s.divider} />

        <Text style={s.textSmall}>
          🔒 Pour des raisons de sécurité, vous devrez définir un nouveau mot
          de passe lors de votre première connexion.
        </Text>
        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EmployeeCredentialsEmail,
  subject: 'Vos identifiants DogWork',
  displayName: 'Identifiants employé / refuge',
  previewData: {
    name: 'Léa', shelterName: 'Refuge des Vergers',
    loginEmail: 'lea@refuge.ch', temporaryPassword: 'Tx7Rk9Fp2qLm',
  },
} satisfies TemplateEntry
