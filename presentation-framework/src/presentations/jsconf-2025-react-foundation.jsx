/**
 * JSConf 2025 - React Foundation Keynote Presentation
 * By Seth Webster, Executive Director, React Foundation
 *
 * This is a complete presentation package that can be loaded by the Presentation Framework.
 * Place accompanying assets in a folder named "jsconf-2025-react-foundation-assets/"
 */

import { Reveal } from "../components/Reveal.jsx";
import { FadeOut } from "../components/FadeOut.jsx";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const presentationConfig = {
  title: "React Foundation Keynote",
  author: "Seth Webster",
  event: "JSConf 2025",
  assetsPath: "./jsconf-2025-react-foundation-assets",
};

// ============================================================================
// CUSTOM STYLES
// ============================================================================

export const customStyles = `
/* React Logo Styling */
.react-logo {
  position: absolute;
  bottom: 2rem;
  right: 6rem;
  width: 60px;
  height: 60px;
  opacity: 0.7;
  filter: brightness(0) invert(1);
  view-transition-name: react-brand-logo;
}

.hero-logo {
  width: 300px;
  height: 300px;
  margin: 2rem auto;
  filter: brightness(0) invert(1);
  opacity: 0.9;
  view-transition-name: react-brand-logo;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* Social Handles */
.social-handles {
  display: flex;
  gap: 2.5rem;
  align-items: center;
  justify-content: center;
  margin-top: 1.5rem;
}

.social-handle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.3rem;
  opacity: 0.85;
  font-weight: 500;
}

.social-icon {
  width: 1.3rem;
  height: 1.3rem;
}

/* Logo Placeholder */
.logo-placeholder {
  width: 200px;
  height: 200px;
  margin: 2rem auto;
  filter: brightness(0) invert(1);
  opacity: 0.9;
  view-transition-name: logo;
}

/* Slide-specific Gradients */
.slide-opening { background: linear-gradient(135deg, #1a1464 0%, #2d1b5e 100%); }
.slide-declarative { background: linear-gradient(135deg, #4a0e4e 0%, #6b1e3a 100%); }
.slide-ecosystem { background: linear-gradient(135deg, #0d3f5c 0%, #0a4d5c 100%); }
.slide-truth { background: linear-gradient(135deg, #1a4d2e 0%, #0f3d3c 100%); }
.slide-opensource { background: linear-gradient(135deg, #5c1f35 0%, #6b3410 100%); }
.slide-intro { background: linear-gradient(135deg, #0a3d3e 0%, #1a0b33 100%); }
.slide-encounter { background: linear-gradient(135deg, #2d4a5c 0%, #3d2a4a 100%); }
.slide-northstar { background: linear-gradient(135deg, #4a1f3d 0%, #3d2654 100%); }
.slide-journey { background: linear-gradient(135deg, #5c3a1f 0%, #4a2d2d 100%); }
.slide-shaping { background: linear-gradient(135deg, #3d1a2d 0%, #2d3d4a 100%); }
.slide-question { background: linear-gradient(135deg, #2d2654 0%, #1f3d5c 100%); }
.slide-foundation { background: linear-gradient(135deg, #4a1f2d 0%, #5c1a33 100%); }
.slide-partners { background: linear-gradient(135deg, #1a0b33 0%, #0f2554 100%); }
.slide-governance { background: linear-gradient(135deg, #0f4a3d 0%, #1f3d4a 100%); }
.slide-youbuild { background: linear-gradient(135deg, #4a2d2d 0%, #3d2654 100%); }
.slide-invitation { background: linear-gradient(135deg, #3d1a4a 0%, #0f3d5c 90%, #1a4d2e 100%); }
.slide-bringideas { background: linear-gradient(135deg, #4a2d1f 0%, #5c1f2d 50%, #3d1a2d 100%); }
.slide-ask { background: linear-gradient(135deg, #3d2654 0%, #5c4a2d 100%); }
.slide-why { background: linear-gradient(135deg, #5c3d1f 0%, #3d5c5c 100%); }
.slide-closing { background: linear-gradient(135deg, #2d4d5c 0%, #1f3d6b 100%); }

/* Partners Slide Layout */

.partners-title-container {
  position: relative;
}

.partners-title-container > div:first-child {
  opacity: 1;
}

.partners-title-container > div:last-child {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.partners-title-container h1 {
  white-space: nowrap;
}

/* Partners Grid */
.partners-logo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  margin-top: 0;
  max-width: 85%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
  animation: grid-fade-in 0.3s ease-out forwards;
  animation-delay: 2s;
}

@keyframes grid-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.partner-logo-box {
  position: relative;
  padding: 2.5rem 2rem;
  border-radius: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

@keyframes partner-reveal {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.partner-logo-box.community {
  background: transparent;
}

.logo-placeholder-text {
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
}

.partner-logo-box.community .logo-placeholder-text {
  color: var(--primary-color);
  font-size: 2.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.plus-sign { font-size: 3rem; font-weight: 700; }

.pointing-finger {
  font-size: 3.5rem;
  animation: point-at-you 1s ease-in-out infinite;
  transform-origin: center;
}

@keyframes point-at-you {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.partner-logo-img {
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
}

[data-company="meta"] .partner-logo-img,
[data-company="amazon"] .partner-logo-img,
[data-company="expo"] .partner-logo-img,
[data-company="vercel"] .partner-logo-img {
  filter: brightness(0) invert(1);
  opacity: 0.9;
}

[data-company="microsoft"] .partner-logo-img {
  filter: grayscale(1) brightness(0) invert(1);
  opacity: 0.9;
}

[data-company="callstack"] .partner-logo-img,
[data-company="softwaremansion"] .partner-logo-img {
  opacity: 0.95;
}
`;

// ============================================================================
// DATA
// ============================================================================

const partners = [
  {
    id: "meta",
    name: "Meta",
    logo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg",
  },
  {
    id: "amazon",
    name: "Amazon",
    logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  },
  {
    id: "expo",
    name: "Expo",
    logo: "expo-logo-wordmark.svg",
    scale: 1,
  },
  {
    id: "vercel",
    name: "Vercel",
    logo: "vercel-logotype-light.png",
  },
  {
    id: "callstack",
    name: "Callstack",
    logo: "callstack-logo.svg",
  },
  {
    id: "softwaremansion",
    name: "Software Mansion",
    logo: "software-mansion.svg",
  },
];

// ============================================================================
// SLIDES
// ============================================================================

export const getSlides = (assetsPath) => {
  const reactLogo = `${assetsPath}/react_logo_dark.svg`;

  return [
    {
      id: "opening",
      className: "slide-opening",
      hideBrandLogo: true,
      notes:
        "You know, every so often, something comes along in software that changes not just how we build—but why we build. A shift so deep that it stops being about just syntax or syntactic sugar…and starts being about people. About how we think. About how we create together.",
      content: (
        <>
          <img src={reactLogo} alt="React" className="hero-logo" />
          <h1>
            How We Build
            <br />
            <span className="highlight">Why We Build</span>
          </h1>
        </>
      ),
    },
    {
      id: "declarative",
      className: "slide-declarative",
      notes:
        "That's what happened when so many people started writing declarative code. When we stopped telling the computer exactly what to do, and instead began thinking in components, state, and how to represent that state over time.",
      content: (
        <>
          <h1>The Declarative Shift</h1>
          <h2>Components • State • Time</h2>
        </>
      ),
    },
    {
      id: "ecosystem",
      className: "slide-ecosystem",
      notes:
        "That tiny mental shift opened a door to everything that came next—React, Swift, Vue, Svelte, Solid, Astro, Jetpack Compose, and many more. And of course, the whole constellation of ideas that define modern JavaScript today.",
      content: (
        <>
          <h1>
            React • Vue • Svelte
            <br />
            Swift • Solid • Astro
          </h1>
          <p className="emphasis">A constellation of ideas</p>
        </>
      ),
    },
    {
      id: "truth",
      className: "slide-truth",
      notes:
        "And behind all of it is one simple truth: Our greatest innovation as developers is not our code. It's our collaboration. It's always about the people. It's about YOU.",
      content: (
        <>
          <h1>
            Our Greatest Innovation
            <br />
            Is Not Our Code
          </h1>
          <h1 className="highlight">It's Our Collaboration</h1>
        </>
      ),
    },
    {
      id: "opensource",
      className: "slide-opensource",
      notes:
        "Every library, every framework, every experiment that's ever pushed the web forward—came from people who cared enough to share, to teach, to build in the open. That's our superpower.",
      content: (
        <>
          <h1>
            That's Our
            <br />
            <span className="highlight">Superpower</span>
          </h1>
        </>
      ),
    },
    {
      id: "intro",
      className: "slide-intro",
      notes:
        "As Robin shared, I am Seth Webster, and it's my privilege to be here with you today, at my first JSConf! I've been the head of React at Meta for the past 5 years, and as of last week, I'm honored to have been named the Executive Director of the newly forming React Foundation. Now, I get questions a lot about my voice, so since I am meeting some of you for the first time… no, I am not sick, I have a vocal disability called \"Spasmodic dysphonia\" — So that's why I sound so cool.",
      content: (
        <>
          <img src={reactLogo} alt="React" className="logo-placeholder" />
          <h1>Seth Webster</h1>
          <h2>
            Executive Director
            <br />
            React Foundation
          </h2>
          <div className="social-handles">
            <div className="social-handle">
              <svg
                className="social-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @sethwebster
            </div>
            <div className="social-handle">
              <svg
                className="social-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              @sethwebsterphoto
            </div>
          </div>
        </>
      ),
    },
    {
      id: "encounter",
      className: "slide-encounter",
      notes:
        "When I first encountered React, I saw something that went way beyond technology. It wasn't just a clever way to render UIs. It was a community that believed deeply that if we help others bring their ideas to life, ours will follow.",
      content: (
        <>
          <h1>
            More Than
            <br />
            Technology
          </h1>
          <h2 className="highlight">A Community</h2>
        </>
      ),
    },
    {
      id: "northstar",
      className: "slide-northstar",
      notes:
        "That idea—that open collaboration is a multiplier of human creativity—is why I fell in love with this work. That and it serves my North Star of helping others bring their ideas to life.",
      content: (
        <>
          <h1>My North Star</h1>
          <h2 className="highlight">
            Helping Others Bring
            <br />
            Their Ideas to Life
          </h2>
        </>
      ),
    },
    {
      id: "journey",
      className: "slide-journey",
      notes:
        "For the last DECADE+ React has had a heck of a run, and for the last six years, I've had a front-row seat to something extraordinary: watching an open-source idea continue to evolve into one of the most influential technologies in software history. React is now part of millions of apps and sites. It's shaped the thinking of every major platform vendor—from Apple to Google to Amazon to Microsoft.",
      content: (
        <>
          <h1>Over a Decade</h1>
          <h2>
            Millions of Apps
            <br />
            Every Major Platform
          </h2>
        </>
      ),
    },
    {
      id: "shaping",
      className: "slide-shaping",
      notes:
        "But more importantly, it's shaped people: how we learn, how we mentor, how we imagine.",
      content: (
        <>
          <h1>But More Importantly...</h1>
          <h2 className="highlight">It's Shaped People</h2>
        </>
      ),
    },
    {
      id: "question",
      className: "slide-question",
      notes:
        "And yet, with that success came a new question: How do we protect something that has become so important to so many people? How do we make sure React's future isn't tied to one person, one company, one team, or one generation of maintainers?",
      content: (
        <>
          <h1>The Question</h1>
          <h2>
            How do we protect
            <br />
            what we've built together?
          </h2>
        </>
      ),
    },
    {
      id: "foundation",
      className: "slide-foundation",
      notes:
        "Well, that's the why behind the React Foundation. It's a new, independent home, in partnership with the Linux Foundation, designed to keep React open, community-driven, and built for everyone—for the next fifteen years and beyond.",
      content: (
        <>
          <img src={reactLogo} alt="React" className="logo-placeholder" />
          <h1>The React Foundation</h1>
          <h2>Independent • Open • For Everyone</h2>
        </>
      ),
    },
    {
      id: "partners",
      className: "slide-partners",
      notes:
        "It brings together partners like Meta, Microsoft, Amazon, Expo, Vercel, Callstack, and Software Mansion, working alongside the global developer community—not above it.",
      content: (
        <>
          <div className="partners-title-container">
            <FadeOut delay={1200} duration={400}>
              <h1>Building Together</h1>
            </FadeOut>
            <Reveal delay={1500} animation="fade" duration={800}>
              <h1
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  whiteSpace: "nowrap",
                }}
              >
                Better Together
              </h1>
            </Reveal>
          </div>
          <div className="partners-logo-grid" key="partners-grid">
            {partners.map((partner, index) => (
              <Reveal
                key={partner.id}
                delay={1000 * (index + 2)}
                animation="scale"
                duration={500}
                className="partner-logo-box max-h-1 mb-8 mt-2"
                data-company={partner.id}
              >
                <img
                  src={
                    partner.logo.startsWith("http")
                      ? partner.logo
                      : `${assetsPath}/${partner.logo}`
                  }
                  alt={partner.name}
                  className="partner-logo-img"
                  style={
                    partner.scale
                      ? { transform: `scale(${partner.scale})` }
                      : {}
                  }
                />
              </Reveal>
            ))}
            <Reveal
              delay={11000}
              animation="bounce"
              duration={500}
              className="partner-logo-box max-h-1 community mt-2"
              data-company="community"
              placeholder={<div className="logo-placeholder-text">???</div>}
            >
              <div className="logo-placeholder-text community-text">
                <span className="pointing-finger">🫵</span>
              </div>
            </Reveal>
          </div>
        </>
      ),
    },
    {
      id: "governance",
      className: "slide-governance",
      notes:
        "This is more than a governance change… It's a promise: That the ideas we build together deserve to last. They deserve to grow and flourish and belong to all of us.",
      content: (
        <>
          <h1>More Than Governance</h1>
          <h2 className="highlight">A Promise</h2>
        </>
      ),
    },
    {
      id: "youbuild",
      className: "slide-youbuild",
      notes:
        "But here's the thing: a foundation alone doesn't build the future. You do. Every speaker, every contributor, every late-nighter experimenting with a new way of doing something—you are what makes this community alive.",
      content: (
        <>
          <h1 className="highlight">You</h1>
          <h2>Build the Future</h2>
        </>
      ),
    },
    {
      id: "invitation",
      className: "slide-invitation",
      notes:
        "And that's why I'm here today, not just to meet you or announce the foundation, but to invite you into it. If you care about React—if you care about open source, about sustainability, about the next generation of developers—then this is your moment to help shape what comes next.",
      content: (
        <>
          <h1>Your Invitation</h1>
          <h2>Help Shape What Comes Next</h2>
        </>
      ),
    },
    {
      id: "bringideas",
      className: "slide-bringideas",
      notes:
        "Bring your ideas. Bring your experiments. Bring your stubborn opinions about this versus that. We want all of it. Because when we bring our collective curiosity together, even when it's uncomfortable, that's where the magic happens.",
      content: (
        <>
          <h1>Bring Your Ideas</h1>
          <h2>Bring Your Experiments</h2>
          <h2 className="highlight">Bring Your Opinions</h2>
        </>
      ),
    },
    {
      id: "ask",
      className: "slide-ask",
      notes:
        "So here's my ask as we close: Take a moment this week—during JSConf, between sessions, over coffee—and remind yourself why you build. Not just what you build, not even how, but why.",
      content: (
        <>
          <h1>My Ask</h1>
          <h2>
            Why do <span className="highlight">you</span> build?
          </h2>
        </>
      ),
    },
    {
      id: "why",
      className: "slide-why",
      notes:
        'For me, the "why" has always been simple: To help others bring their ideas to life. That\'s the heartbeat of this whole ecosystem.',
      content: (
        <>
          <h1 className="highlight">
            To help others bring
            <br />
            their ideas to life
          </h1>
        </>
      ),
    },
    {
      id: "closing",
      className: "slide-closing",
      notes:
        "And with the React Foundation, I believe we're making sure that heartbeat keeps going—strong, open, and human—for decades to come. Thank you. I can't wait to build the next chapter with you.",
      content: (
        <>
          <h1>Thank You</h1>
          <h2 className="highlight">Let's Build the Next Chapter</h2>
          <img src={reactLogo} alt="React" className="logo-placeholder" />
        </>
      ),
    },
  ];
};

// ============================================================================
// BRAND LOGO COMPONENT
// ============================================================================

export const getBrandLogo = (assetsPath) => {
  return (
    <img
      src={`${assetsPath}/react_logo_dark.svg`}
      alt="React"
      className="react-logo"
      style={{ viewTransitionName: "react-brand-logo" }}
    />
  );
};
