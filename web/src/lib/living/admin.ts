import { defineSection } from './define';

export const admin = defineSection(
  {
    domains: {
      title: 'Verified university domains',
      lede: 'An email on one of these domains (or a subdomain) proves university enrolment. Sign in with Google or an emailed code then verifies a resident instantly.',
      list: 'Recognised domains',
      empty: 'No domains yet.',
      remove: 'Remove',
      add: 'Add domain',
      domain: 'Domain (for example uef.fi)',
      institution: 'Institution name',
    },
  },
  {
    domains: {
      title: 'Vahvistetut oppilaitosten verkkotunnukset',
      lede: 'Näiden verkkotunnusten (tai alitunnusten) sähköposti todistaa oppilaitoksen läsnäolon. Google-kirjautuminen tai sähköpostikoodi vahvistaa asukkaan heti.',
      list: 'Tunnetut verkkotunnukset',
      empty: 'Ei vielä verkkotunnuksia.',
      remove: 'Poista',
      add: 'Lisää verkkotunnus',
      domain: 'Verkkotunnus (esimerkiksi uef.fi)',
      institution: 'Oppilaitoksen nimi',
    },
  },
);
