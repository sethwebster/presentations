import { useState, useEffect } from 'react';
import callstackLogo from '../assets/partners/SVG_longlogo_Callstack Logo white_white callstack.svg';
import softwareMansionLogo from '../assets/partners/software-mansion.svg';
import expoLogo from '../assets/partners/expo-logo-wordmark.svg';
import vercelLogo from '../assets/partners/vercel-logotype-light.png';

const partners = [
  {
    id: 'meta',
    name: 'Meta',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg'
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg'
  },
  {
    id: 'amazon',
    name: 'Amazon',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg'
  },
  {
    id: 'expo',
    name: 'Expo',
    logo: expoLogo
  },
  {
    id: 'vercel',
    name: 'Vercel',
    logo: vercelLogo
  },
  {
    id: 'callstack',
    name: 'Callstack',
    logo: callstackLogo
  },
  {
    id: 'softwaremansion',
    name: 'Software Mansion',
    logo: softwareMansionLogo
  }
];

export function PartnersSlide() {
  const [showCommunity, setShowCommunity] = useState(false);

  useEffect(() => {
    // Show community box after all partners have animated in
    const timer = setTimeout(() => {
      setShowCommunity(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <h1>Building Together</h1>
      <div className="partners-logo-grid">
        {partners.map((partner) => (
          <div key={partner.id} className="partner-logo-box" data-company={partner.id}>
            {partner.logo ? (
              <img src={partner.logo} alt={partner.name} className="partner-logo-img" />
            ) : partner.svg ? (
              <div className="partner-logo-img">{partner.svg}</div>
            ) : (
              <div className="logo-placeholder-text">{partner.name}</div>
            )}
          </div>
        ))}
        <div className="partner-logo-box community" data-company="community">
          <div className="logo-placeholder-text community-text">
            {showCommunity ? (
              <>
                <span className="plus-sign">+</span>
                <span className="pointing-finger">🫵</span>
              </>
            ) : '???'}
          </div>
        </div>
      </div>
    </>
  );
}
