/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  ticketId?: string
  preview?: string
}

const SupportTicketRepliedEmail = ({ name, ticketId, preview }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Une réponse à votre demande vous attend — DogWork</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.logoSection}>
          <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
        </Section>

        <Heading style={s.h1}>Vous avez une réponse</Heading>
        <Text style={s.text}>
          {name ? `Bonjour ${name},` : 'Bonjour,'} l'équipe DogWork a répondu à
          votre demande{ticketId ? ` #${ticketId}` : ''}.
        </Text>

        {preview && (
          <Section style={s.cardAccent}>
            <Text style={{ ...s.text, margin: 0, fontStyle: 'italic' }}>« {preview} »</Text>
          </Section>
        )}

        <Section style={s.buttonSection}>
          <Button style={s.button} href={`${SITE_URL}/support`}>Voir la réponse</Button>
        </Section>

        <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SupportTicketRepliedEmail,
  subject: ({ ticketId }: any) =>
    ticketId ? `Réponse à votre demande #${ticketId} — DogWork` : 'Réponse à votre demande — DogWork',
  displayName: 'Ticket support — réponse',
  previewData: { name: 'Marie', ticketId: '1042', preview: 'Bonjour Marie, voici la marche à suivre…' },
} satisfies TemplateEntry
