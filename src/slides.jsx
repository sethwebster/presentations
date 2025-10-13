export const slides = [
  {
    id: 'opening',
    className: 'slide-opening',
    notes: 'You know, every so often, something comes along in software that changes not just how we build—but why we build. A shift so deep that it stops being about just syntax or syntactic sugar…and starts being about people. About how we think. About how we create together.',
    content: (
      <>
        <h1>How We Build<br/><span className="highlight">Why We Build</span></h1>
      </>
    )
  },
  {
    id: 'declarative',
    className: 'slide-declarative',
    notes: 'That\'s what happened when so many people started writing declarative code. When we stopped telling the computer exactly what to do, and instead began thinking in components, state, and how to represent that state over time.',
    content: (
      <>
        <h1>The Declarative Shift</h1>
        <h2>Components • State • Time</h2>
      </>
    )
  },
  {
    id: 'ecosystem',
    className: 'slide-ecosystem',
    notes: 'That tiny mental shift opened a door to everything that came next—React, Swift, Vue, Svelte, Solid, Astro, Jetpack Compose, and many more. And of course, the whole constellation of ideas that define modern JavaScript today.',
    content: (
      <>
        <h1>React • Vue • Svelte<br/>Swift • Solid • Astro</h1>
        <p className="emphasis">A constellation of ideas</p>
      </>
    )
  },
  {
    id: 'truth',
    className: 'slide-truth',
    notes: 'And behind all of it is one simple truth: Our greatest innovation as developers is not our code. It\'s our collaboration. It\'s always about the people. It\'s about YOU.',
    content: (
      <>
        <h1>Our Greatest Innovation<br/>Is Not Our Code</h1>
        <h1 className="highlight">It's Our Collaboration</h1>
      </>
    )
  },
  {
    id: 'opensource',
    className: 'slide-opensource',
    notes: 'Every library, every framework, every experiment that\'s ever pushed the web forward—came from people who cared enough to share, to teach, to build in the open. That\'s our superpower.',
    content: (
      <>
        <h1>That's Our<br/><span className="highlight">Superpower</span></h1>
      </>
    )
  },
  {
    id: 'intro',
    className: 'slide-intro',
    notes: 'As Robin shared, I am Seth Webster, and it\'s my privilege to be here with you today, at my first JSConf! I\'ve been the head of React at Meta for the past 5 years, and as of last week, I\'m honored to serve as the Executive Director of the newly forming React Foundation. Now, I get questions a lot about my voice, so since I am meeting some of you for the first time… no, I am not sick, I have a vocal disability called "Spasmodic dysphonia" — So that\'s why I sound so cool.',
    content: (
      <>
        <div className="logo-placeholder">⚛️</div>
        <h1>Seth Webster</h1>
        <h2>Executive Director<br/>React Foundation</h2>
      </>
    )
  },
  {
    id: 'encounter',
    className: 'slide-encounter',
    notes: 'When I first encountered React, I saw something that went way beyond technology. It wasn\'t just a clever way to render UIs. It was a community that believed deeply that if we help others bring their ideas to life, ours will follow.',
    content: (
      <>
        <h1>More Than<br/>Technology</h1>
        <h2 className="highlight">A Community</h2>
      </>
    )
  },
  {
    id: 'northstar',
    className: 'slide-northstar',
    notes: 'That idea—that open collaboration is a multiplier of human creativity—is why I fell in love with this work. That and it serves my North Star of helping others bring their ideas to life.',
    content: (
      <>
        <h1>My North Star</h1>
        <h2 className="highlight">Helping Others Bring<br/>Their Ideas to Life</h2>
      </>
    )
  },
  {
    id: 'journey',
    className: 'slide-journey',
    notes: 'For the last six years, I\'ve had a front-row seat to something extraordinary: watching an open-source idea continue to evolve into one of the most influential technologies in software history. React is now part of millions of apps and sites. It\'s shaped the thinking of every major platform vendor—from Apple to Google to Amazon to Microsoft.',
    content: (
      <>
        <h1>Six Years</h1>
        <h2>Millions of Apps<br/>Every Major Platform</h2>
      </>
    )
  },
  {
    id: 'shaping',
    className: 'slide-shaping',
    notes: 'But more importantly, it\'s shaped people: how we learn, how we mentor, how we imagine.',
    content: (
      <>
        <h1>But More Importantly...</h1>
        <h2 className="highlight">It's Shaped People</h2>
      </>
    )
  },
  {
    id: 'question',
    className: 'slide-question',
    notes: 'And yet, with that success came a new question: How do we protect something that has become so important to so many people? How do we make sure React\'s future isn\'t tied to one person, one company, one team, or one generation of maintainers?',
    content: (
      <>
        <h1>The Question</h1>
        <h2>How do we protect<br/>what we've built together?</h2>
      </>
    )
  },
  {
    id: 'foundation',
    className: 'slide-foundation',
    notes: 'Well, that\'s the why behind the React Foundation. It\'s a new, independent home, in partnership with the Linux Foundation, designed to keep React open, community-driven, and built for everyone—for the next fifteen years and beyond.',
    content: (
      <>
        <div className="logo-placeholder">🏛️</div>
        <h1>The React Foundation</h1>
        <h2>Independent • Open • For Everyone</h2>
      </>
    )
  },
  {
    id: 'partners',
    className: 'slide-partners',
    notes: 'It brings together partners like Meta, Microsoft, Amazon, Expo, Vercel, Callstack, and Software Mansion, working alongside the global developer community—not above it.',
    content: (
      <>
        <h1>Building Together</h1>
        <div className="partners-grid">
          <div className="partner-logo">Meta</div>
          <div className="partner-logo">Microsoft</div>
          <div className="partner-logo">Amazon</div>
          <div className="partner-logo">Expo</div>
          <div className="partner-logo">Vercel</div>
          <div className="partner-logo">Callstack</div>
          <div className="partner-logo">Software Mansion</div>
          <div className="partner-logo">+ You</div>
        </div>
      </>
    )
  },
  {
    id: 'governance',
    className: 'slide-governance',
    notes: 'This is more than a governance change… It\'s a promise: That the ideas we build together deserve to last. They deserve to grow and flourish and belong to all of us.',
    content: (
      <>
        <h1>More Than Governance</h1>
        <h2 className="highlight">A Promise</h2>
      </>
    )
  },
  {
    id: 'youbuild',
    className: 'slide-youbuild',
    notes: 'But here\'s the thing: a foundation alone doesn\'t build the future. You do. Every speaker, every contributor, every late-nighter experimenting with a new way of doing something—you are what makes this community alive.',
    content: (
      <>
        <h1 className="highlight">You</h1>
        <h2>Build the Future</h2>
      </>
    )
  },
  {
    id: 'invitation',
    className: 'slide-invitation',
    notes: 'And that\'s why I\'m here today, not just to meet you or announce the foundation, but to invite you into it. If you care about React—if you care about open source, about sustainability, about the next generation of developers—then this is your moment to help shape what comes next.',
    content: (
      <>
        <h1>Your Invitation</h1>
        <h2>Help Shape What Comes Next</h2>
      </>
    )
  },
  {
    id: 'bringideas',
    className: 'slide-bringideas',
    notes: 'Bring your ideas. Bring your experiments. Bring your stubborn opinions about this versus that. We want all of it. Because when we bring our collective curiosity together, even when it\'s uncomfortable, that\'s where the magic happens.',
    content: (
      <>
        <h1>Bring Your Ideas</h1>
        <h2>Bring Your Experiments</h2>
        <h2 className="highlight">Bring Your Opinions</h2>
      </>
    )
  },
  {
    id: 'ask',
    className: 'slide-ask',
    notes: 'So here\'s my ask as we close: Take a moment this week—during JSConf, between sessions, over coffee—and remind yourself why you build. Not just what you build, not even how, but why.',
    content: (
      <>
        <h1>My Ask</h1>
        <h2>Why do <span className="highlight">you</span> build?</h2>
      </>
    )
  },
  {
    id: 'why',
    className: 'slide-why',
    notes: 'For me, the "why" has always been simple: To help others bring their ideas to life. That\'s the heartbeat of this whole ecosystem.',
    content: (
      <>
        <h1 className="highlight">To help others bring<br/>their ideas to life</h1>
      </>
    )
  },
  {
    id: 'closing',
    className: 'slide-closing',
    notes: 'And with the React Foundation, I believe we\'re making sure that heartbeat keeps going—strong, open, and human—for decades to come. Thank you. I can\'t wait to build the next chapter with you.',
    content: (
      <>
        <h1>Thank You</h1>
        <h2 className="highlight">Let's Build the Next Chapter</h2>
        <div className="logo-placeholder">⚛️</div>
      </>
    )
  }
];
