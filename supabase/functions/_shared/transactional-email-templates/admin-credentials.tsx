/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { LOGO_URL, SITE_URL, styles as s } from './_dogwork-styles.ts'

interface Props {
  name?: string
  role?: string
  loginEmail?: string
  temporaryPassword?: string
  pdfUrl?: string
  organizationName?: string
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Propriétaire',
  educator: 'Éducateur canin',
  shelter: 'Refuge',
  shelter_employee: 'Employé de refuge',
  admin: 'Administrateur',
}

const AdminCredentialsEmail = ({
  name, role, loginEmail, temporaryPassword, pdfUrl, organizationName,
}: Props) => {
  const roleLabel = role ? (ROLE_LABEL[role] || role) : null
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Vos identifiants DogWork</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.logoSection}>
            <Img src={LOGO_URL} width="160" height="auto" alt="DogWork" style={s.logo} />
          </Section>

          <Heading style={s.h1}>
            Bienvenue {name ? name : 'sur DogWork'} 🐾
          </Heading>
          <Text style={s.text}>
            Votre compte DogWork{roleLabel ? ` (${roleLabel})` : ''} vient d'être
            créé{organizationName ? ` pour ${organizationName}` : ''}. Vous trouverez
            ci-dessous vos identifiants de connexion.
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

          {pdfUrl && (
            <Section style={s.cardAccent}>
              <Text style={{ ...s.text, margin: '0 0 10px' }}>
                <strong>📄 Votre guide de connexion personnalisé</strong> est disponible
                en PDF (valable 7 jours) :
              </Text>
              <Link href={pdfUrl} style={s.link}>Télécharger mon guide PDF</Link>
            </Section>
          )}

          <Hr style={s.divider} />

          <Text style={s.textSmall}>
            🔒 Pour des raisons de sécurité, vous devrez définir un nouveau mot
            de passe lors de votre première connexion.
          </Text>
          <Text style={s.textSmall}>
            Une question ?{' '}
            <Link href={`${SITE_URL}/help`} style={s.link}>Centre d'aide DogWork</Link>
          </Text>
          <Text style={s.footerBrand}>© DogWork — L'écosystème canin premium</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminCredentialsEmail,
  subject: 'Vos identifiants DogWork 🐾',
  displayName: 'Identifiants compte (créé par admin)',
  previewData: {
    name: 'Marie Dupont',
    role: 'educator',
    loginEmail: 'marie@example.ch',
    temporaryPassword: 'Tx7Rk9Fp2qLm',
    pdfUrl: 'https://example.com/guide.pdf',
    organizationName: 'Refuge des Vergers',
  },
} satisfies TemplateEntry
