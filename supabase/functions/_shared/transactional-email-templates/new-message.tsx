/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  senderName?: string
  preview?: string
}

const NewMessageEmail = ({ name, senderName, preview }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouveau message sur DogWork</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Nouveau message ✉️</Heading>
        <Text style={s.text}>
          {name ? `Bonjour ${name},` : 'Bonjour,'} vous avez reçu un nouveau
          message{senderName ? ` de ${senderName}` : ''} sur DogWork.
        </Text>

        {preview && (
          <Section style={s.cardAccent}>
            <Text style={{ ...s.text, margin: 0, fontStyle: 'italic' }}>« {preview} »</Text>
          </Section>
        )}

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/messages`}>Lire le message</Button>
        </Section>

        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewMessageEmail,
  subject: ({ senderName }: any) =>
    senderName ? `Nouveau message de ${senderName} — DogWork` : 'Nouveau message — DogWork',
  displayName: 'Nouveau message',
  previewData: { name: 'Marie', senderName: 'Julien R.', preview: 'Bonjour Marie, voici le retour sur la séance…' },
} satisfies TemplateEntry
