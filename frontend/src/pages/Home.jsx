import { useEffect, useState } from "react";

const FEATURES = [
  {
    icon: "🔐",
    name: "AES-256-GCM Encryption",
    blurb: "Military-grade encryption with 310,000-iteration PBKDF2 key derivation. Each file gets a unique salt and IV — nothing reused, ever.",
    bullets: ["Browser-native WebCrypto API", "Authenticated encryption (GCM mode)", "No file leaves your device unencrypted"],
    accent: "cyan",
  },
  {
    icon: "🤖",
    name: "AI Threat Scanner",
    blurb: "Drop any file in and have it analyzed by 70+ antivirus engines simultaneously via VirusTotal — plus Shannon-entropy and signature checks running locally.",
    bullets: ["Detects malware, ransomware, suspicious scripts", "Sensitivity slider for entropy threshold", "Full report link to virustotal.com per scan"],
    accent: "red",
  },
  {
    icon: "⛓️",
    name: "Blockchain Key Vault",
    blurb: "Store SHA-256 hashes of your encryption keys on-chain. Tamper-proof audit log that even we cannot quietly modify or remove later.",
    bullets: ["MetaMask wallet integration", "Demo wallet fallback for testing", "Etherscan transaction links"],
    accent: "violet",
  },
  {
    icon: "🔗",
    name: "Zero-Knowledge Share",
    blurb: "Generate a self-contained share link — the encrypted bytes live in the URL fragment, which browsers never send to servers. Truly zero-knowledge delivery.",
    bullets: ["Recipient decrypts in-browser, no backend", "Expiry timer + max-view limits", "QR code for cross-device handoff"],
    accent: "amber",
  },
  {
    icon: "📊",
    name: "Security Analytics",
    blurb: "Real-time score for your encryption hygiene, sharing practices, and biometric setup. Six-month trend chart for blocked threats.",
    bullets: ["Event log of every encrypt/decrypt", "Risk breakdown by category", "Block-rate visualization"],
    accent: "green",
  },
];

const FAQS = [
  {
    q: "Is my data actually private, or is this just marketing?",
    a: "Truly private. All encryption happens inside your browser using the WebCrypto API. The encrypted bytes never travel to our servers. Even if our infrastructure were breached, attackers would find only public metadata — no readable files, ever.",
  },
  {
    q: "What happens if I forget my password?",
    a: "Your password is the only key that can decrypt your files. We don't store it, can't recover it, and have no backdoor. Use a password manager — or write the master password somewhere safe. This is the trade-off of true zero-knowledge: nobody but you can read your data, including us.",
  },
  {
    q: "Can I use this on multiple devices?",
    a: "Yes. Sign in with the same email and password anywhere — your account is universal. Biometric login is device-specific (enrolled separately on each device for security), but password sign-in works on every browser and OS.",
  },
  {
    q: "How is this different from Google Drive or iCloud?",
    a: "Those services encrypt your files using keys they control. They can decrypt them to scan for malware, comply with subpoenas, or as a consequence of a breach. SecureVault AI derives keys from your password locally — we literally cannot read your files.",
  },
  {
    q: "Is the AI threat scanner just a gimmick?",
    a: "No. It uses VirusTotal under the hood, which aggregates results from 70+ industry-standard antivirus engines (Kaspersky, ESET, McAfee, Bitdefender, and others). When you scan a file, all of them analyze it in parallel and the results merge into a single report.",
  },
  {
    q: "Why blockchain in a security app — is this just a buzzword?",
    a: "It's optional, but real. Blockchain provides an immutable audit trail for key operations. When you store a key hash on-chain, no one — including us — can later modify or remove that record. It's verification you don't need to trust us for.",
  },
  {
    q: "Is biometric login as secure as a password?",
    a: "Generally stronger. Biometric uses WebAuthn (the standard behind passkeys). Your fingerprint or face never leaves your device — only a cryptographic signature is exchanged. The match is performed inside your device's secure enclave.",
  },
  {
    q: "Why should I trust your servers?",
    a: "You don't have to. Encryption, decryption, password derivation, AI scanning, even the share-link recipient page — everything runs inside your browser. The .svault files you download work even if our servers disappear tomorrow.",
  },
];

const BLOG = [
  {
    id: "equifax",
    tag: "Case study",
    title: "Equifax 2017: 147 Million Documents, One Missing Patch, 76 Days Undetected",
    excerpt: "An unpatched Apache Struts vulnerability gave attackers two and a half months of unrestricted access. Half the US adult population had their full credit-bureau profile stolen.",
    date: "Mar 28, 2026",
    minutes: 5,
    accent: "red",
  },
  {
    id: "lastpass",
    tag: "Vault breach",
    title: "LastPass 2022: When the Vault Maker's Vault Gets Pwned",
    excerpt: "Source code stolen in August, customer vault data exfiltrated in December. Encrypted blobs, yes — but URLs were plaintext, and offline brute-forcing was now on the menu.",
    date: "Mar 21, 2026",
    minutes: 6,
    accent: "amber",
  },
  {
    id: "anthem",
    tag: "Healthcare",
    title: "Anthem 2015: 78.8 Million Health Records and the Phishing Email That Cost $115M",
    excerpt: "Anthem's defense at the time was that encryption-at-rest 'would have prevented legitimate access.' That logic crumbled when one phishing click exposed 36 months of patient data.",
    date: "Mar 14, 2026",
    minutes: 7,
    accent: "violet",
  },
  {
    id: "office365",
    tag: "Threat brief",
    title: "Storm-0558: How a Forged Microsoft Key Unlocked US Government Inboxes",
    excerpt: "In mid-2023, a single stolen signing key let attackers mint authentication tokens for any Office 365 user. The takeaway: server-side encryption only protects you against people without the keys.",
    date: "Mar 07, 2026",
    minutes: 6,
    accent: "cyan",
  },
];

const BLOG_BODIES = {
  equifax: [
    "On September 7, 2017, Equifax — one of the three major US credit bureaus — disclosed that attackers had stolen the personal data of 147 million people. Names, Social Security numbers, dates of birth, addresses, and in roughly 200,000 cases, driver's license numbers and credit-card data.",
    "The technical root cause was almost banal: an unpatched copy of Apache Struts (CVE-2017-5638). The vulnerability had been publicly disclosed and a patch released back in March 2017. Equifax's internal vulnerability scan reportedly missed the affected server, and the patch was never applied.",
    "Attackers exploited the bug on May 13, 2017. They moved laterally inside Equifax's network for the next 76 days, exfiltrating data in encrypted batches small enough to evade detection. The breach was finally noticed on July 29 — by which point the damage was complete.",
    "The settlement reached $700 million. But the deeper lesson is structural: every Equifax customer's data sat on a server that the company itself could read. Once attackers crossed the perimeter, encryption-at-rest was meaningless because the application has to decrypt to function. Zero-knowledge architectures invert this — the server holds only ciphertext it can never decrypt, even if a Struts vulnerability hands an attacker the keys to the kingdom.",
  ],

  lastpass: [
    "In August 2022, LastPass disclosed that an attacker had accessed its development environment and stolen source code plus internal documentation. The company initially insisted that no customer vault data was at risk.",
    "Four months later, that statement changed. Using credentials harvested from the August breach, attackers had accessed a cloud backup that included encrypted customer vaults. The exact contents: AES-256-CBC encrypted blobs (the parts requiring the master password), but also plaintext metadata — including the URLs of every site each user stored credentials for.",
    "The mathematics were brutal. Customers whose master passwords were strong (random, 16+ characters, unique to LastPass) were probably safe. Customers whose master passwords were weak or reused became immediately phishable: an attacker now knew exactly which bank, exchange, or workplace each victim had accounts on, and had unlimited offline attempts at brute-forcing the vault.",
    "By early 2023, security researchers began correlating the LastPass leak with a string of high-value cryptocurrency thefts. The lesson: encryption is a function of key quality, not the algorithm. AES-256 with a weak passphrase is just slow to brute force — not unbreakable. And the metadata you don't think about (URLs, account labels, file names) is often what makes targeted attacks possible.",
  ],

  anthem: [
    "On February 4, 2015, Anthem — the second-largest health insurer in the United States — disclosed that attackers had stolen 78.8 million records. The exposed data was a near-complete identity package: names, dates of birth, Social Security numbers, addresses, email addresses, employment history, and income.",
    "Investigators traced the breach to a phishing email sent to an Anthem subsidiary employee. A single click installed a remote-access tool that gave attackers a foothold. From there they spent more than a month moving laterally, eventually reaching the central data warehouse where 36 million households' worth of records were stored — unencrypted.",
    "Anthem's lawyers later argued in court filings that encryption-at-rest 'would have prevented legitimate access to the data' by their own analytics systems. That argument is technically true and morally bankrupt: it's an admission that the architecture explicitly traded security for convenience. The company settled for $115 million.",
    "Healthcare data has a half-life of decades. A leaked credit card can be replaced overnight; a leaked SSN cannot be reissued, and a leaked diagnosis stays leaked forever. SecureVault AI's approach — encryption that the platform itself cannot reverse — is the only model in which 'a phishing click' doesn't translate to 'every record readable.'",
  ],

  office365: [
    "In June 2023, US State Department engineers noticed something strange in their Microsoft 365 audit logs: authentication tokens that hadn't been issued by Microsoft. After several weeks of forensics, Microsoft confirmed the worst: a China-linked actor it tracked as Storm-0558 had obtained one of Microsoft's own consumer signing keys and was using it to forge access tokens for any Microsoft account it wanted.",
    "The scope was eventually narrowed to roughly 25 organizations including the State Department and Department of Commerce. But the architectural implication was much wider. For any organization using Microsoft 365, the platform holds the keys that encrypt your email, your OneDrive files, your SharePoint sites. The 'encryption' is real — but the platform itself decrypts to serve content to whomever holds a valid token.",
    "Microsoft never publicly explained exactly how the consumer signing key was stolen. A subsequent CSRB report blamed a 'cascade of avoidable errors' across multiple Microsoft teams. The company is still reckoning with what it means to be the world's largest holder of corporate documents.",
    "The deeper point: any encryption scheme that lets the service operator read your data on demand is one stolen key away from a mass breach. Zero-knowledge encryption is fundamentally different — the data is encrypted before it reaches our servers, and the keys are derived from your password locally. We do not have those keys. No one can steal them from us, because they aren't here.",
  ],
};

const TRUST = [
  { label: "AES-256-GCM",            note: "Authenticated encryption" },
  { label: "PBKDF2 · 310,000 iters", note: "OWASP 2023 recommendation" },
  { label: "Zero-knowledge",         note: "Keys never leave device" },
  { label: "100% browser-side",      note: "No backend reads your data" },
];

export default function Home({ navigate, theme, onToggleTheme, isAuthenticated, onGuestLogin }) {
  const [openFaq,  setOpenFaq]  = useState(0);
  const [openBlog, setOpenBlog] = useState(null);   // article id or null

  // Scroll-triggered reveal animation. Once an element enters view, it stays revealed.
  useEffect(() => {
    const els = document.querySelectorAll(".scroll-fade");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // ESC closes article modal; also lock body scroll while modal is open
  useEffect(() => {
    if (!openBlog) return;
    const onKey = (e) => { if (e.key === "Escape") setOpenBlog(null); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openBlog]);

  const article = BLOG.find((b) => b.id === openBlog);

  return (
    <div style={styles.page}>
      {/* Decorative background */}
      <div style={styles.gridBg} />
      <div className="float-orb"   style={{ ...styles.orb, top: "5%",  left: "10%", background: "radial-gradient(circle, rgba(167,139,250,0.22) 0%, transparent 70%)" }} />
      <div className="float-orb-2" style={{ ...styles.orb, top: "30%", right: "5%", background: "radial-gradient(circle, rgba(34,211,238,0.20)  0%, transparent 70%)" }} />
      <div className="float-orb-3" style={{ ...styles.orb, top: "70%", left: "20%", background: "radial-gradient(circle, rgba(52,211,153,0.12)  0%, transparent 70%)" }} />

      {/* Top nav */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} style={styles.navLogo}>
            <span style={styles.navLogoIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </span>
            <span style={styles.navLogoText}>SecureVault <span style={{ color: "var(--accent-cyan)" }}>AI</span></span>
          </a>

          <div style={styles.navLinks}>
            <a href="#features" style={styles.navLink}>Features</a>
            <a href="#how"      style={styles.navLink}>How it works</a>
            <a href="#faq"      style={styles.navLink}>FAQ</a>
            <a href="#blog"     style={styles.navLink}>Blog</a>
          </div>

          <div style={styles.navActions}>
            <button onClick={onToggleTheme} style={styles.themeBtn}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            {isAuthenticated ? (
              <button className="btn btn-primary" onClick={() => navigate("/dashboard")}
                style={{ padding: "10px 20px" }}>
                Open Vault →
              </button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => navigate("/login?mode=signin")}
                  style={{ padding: "10px 18px" }}>
                  Sign In
                </button>
                <button className="btn btn-primary" onClick={() => navigate("/login?mode=signup")}
                  style={{ padding: "10px 20px" }}>
                  Get Started Free →
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─────────────────── HERO ─────────────────── */}
      <section style={styles.hero}>
        <span style={styles.heroPill}>
          🔒 Zero-knowledge encryption · No server reads your files
        </span>
        <h1 style={styles.heroTitle}>
          Your documents, locked behind <span className="text-gradient-anim">math</span>.
          <br />Not <span style={styles.strikeWord}>trust</span>.
        </h1>
        <p style={styles.heroSub}>
          End-to-end encryption, AI threat scanning, and zero-knowledge sharing — all running
          inside your browser. Your password is the only key. We <em>literally cannot</em> see your files.
        </p>

        <div style={styles.heroCtas}>
          {isAuthenticated ? (
            <button className="btn btn-primary btn-breathe" onClick={() => navigate("/dashboard")}
              style={{ padding: "14px 28px", fontSize: 16 }}>
              Open Your Vault →
            </button>
          ) : (
            <>
              <button className="btn btn-primary btn-breathe" onClick={() => navigate("/login?mode=signup")}
                style={{ padding: "14px 28px", fontSize: 16 }}>
                Create your free account →
              </button>
              <button className="btn btn-cyan" onClick={() => navigate("/login?mode=signin")}
                style={{ padding: "14px 28px", fontSize: 16 }}>
                Sign in
              </button>
            </>
          )}
        </div>

        {!isAuthenticated && onGuestLogin && (
          <button onClick={onGuestLogin} style={styles.guestLink}>
            → Or try it as a guest — no signup, browser-only
          </button>
        )}

        <div style={styles.trustRow} className="scroll-stagger">
          {TRUST.map((t, i) => (
            <div key={i} style={styles.trustItem} className="scroll-fade">
              <div style={styles.trustLabel}>{t.label}</div>
              <div style={styles.trustNote}>{t.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────── WHY ─────────────────── */}
      <section style={styles.section}>
        <div style={styles.sectionEyebrow}>WHY YOU NEED THIS</div>
        <h2 style={styles.sectionTitle}>
          Your "cloud storage" reads every file you put in it.
        </h2>
        <p style={styles.sectionLead}>
          Most cloud services advertise "encryption" — but they hold the keys, scan your content,
          comply with subpoenas, and lose data in breaches. SecureVault AI flips that model.
        </p>

        <div style={styles.whyGrid} className="scroll-stagger">
          <WhyCard
            icon="🏦"
            title="The Drive Problem"
            text="Google, Dropbox, iCloud — they encrypt your files using keys they control. When their servers get breached or subpoenaed, your data is readable. You're trusting a company you can't audit."
            bad
          />
          <WhyCard
            icon="📨"
            title="The Email Problem"
            text="Email attachments travel through 4-7 intermediary servers, each storing a copy. Recipients' spam filters, archive systems, and IT admins can all see what you sent."
            bad
          />
          <WhyCard
            icon="🔑"
            title="The Password Problem"
            text="On most platforms, your password unlocks an account — not your data. Reset it once, and you're back in. That's convenient, but it means the platform always has the real key."
            bad
          />
          <WhyCard
            icon="✓"
            title="The SecureVault way"
            text="Your password derives the encryption key locally. Files are encrypted before they exist anywhere outside your browser. No reset, no recovery, no backdoor — for anyone."
          />
        </div>
      </section>

      {/* ─────────────────── FEATURES ─────────────────── */}
      <section id="features" style={styles.section}>
        <div style={styles.sectionEyebrow}>WHAT YOU GET</div>
        <h2 style={styles.sectionTitle}>Five tools, one vault.</h2>
        <p style={styles.sectionLead}>
          Everything in this list runs in your browser. Nothing on this page requires a server
          we control to actually read your data.
        </p>

        <div style={styles.featureGrid} className="scroll-stagger">
          {FEATURES.map((f, i) => (
            <div key={i} className="scroll-fade card-hover"
              style={{ ...styles.featureCard, ...accentBorder(f.accent) }}>
              <div style={{ ...styles.featureIcon, ...accentBg(f.accent) }}>{f.icon}</div>
              <h3 style={styles.featureName}>{f.name}</h3>
              <p style={styles.featureBlurb}>{f.blurb}</p>
              <ul style={styles.featureBullets}>
                {f.bullets.map((b, j) => (
                  <li key={j} style={styles.featureBullet}>
                    <span style={{ color: `var(--accent-${f.accent})` }}>›</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────── HOW IT WORKS ─────────────────── */}
      <section id="how" style={styles.section}>
        <div style={styles.sectionEyebrow}>HOW IT WORKS</div>
        <h2 style={styles.sectionTitle}>Set up in under two minutes.</h2>

        <div style={styles.stepsGrid} className="scroll-stagger">
          <Step n={1} title="Create your account"
            text="Email + a strong password. We send a 6-digit OTP to your inbox — no link to click, just type the code."
          />
          <Step n={2} title="(Optional) Enable biometric"
            text="One click in the sidebar enrolls Windows Hello, Touch ID, or your platform authenticator. Next sign-in is instant."
          />
          <Step n={3} title="Drop a file to encrypt"
            text="Drag any file into the encrypt zone. AES-256-GCM ciphertext downloads to your device as a .svault file."
          />
          <Step n={4} title="Share — without leaking"
            text="Generate a zero-knowledge link. Send the password through a different channel. The recipient decrypts in their own browser."
          />
        </div>
      </section>

      {/* ─────────────────── FAQ ─────────────────── */}
      <section id="faq" style={styles.section}>
        <div style={styles.sectionEyebrow}>FREQUENTLY ASKED</div>
        <h2 style={styles.sectionTitle}>Honest answers.</h2>

        <div style={styles.faqList} className="scroll-stagger">
          {FAQS.map((f, i) => (
            <div key={i} className="scroll-fade"
              style={{ ...styles.faqItem, ...(openFaq === i ? styles.faqItemOpen : {}) }}>
              <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} style={styles.faqQuestion}>
                <span style={{ flex: 1 }}>{f.q}</span>
                <span style={styles.faqToggle}>{openFaq === i ? "−" : "+"}</span>
              </button>
              {openFaq === i && (
                <p style={styles.faqAnswer}>{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────── BLOG ─────────────────── */}
      <section id="blog" style={styles.section}>
        <div style={styles.sectionEyebrow}>FROM THE BLOG</div>
        <h2 style={styles.sectionTitle}>Cryptography, made readable.</h2>

        <div style={styles.blogGrid} className="scroll-stagger">
          {BLOG.map((b) => (
            <button key={b.id}
              onClick={() => setOpenBlog(b.id)}
              style={styles.blogCard}
              className="scroll-fade card-hover">
              <div style={{ ...styles.blogTag, ...accentBg(b.accent), color: `var(--accent-${b.accent})` }}>
                {b.tag}
              </div>
              <h3 style={styles.blogTitle}>{b.title}</h3>
              <p style={styles.blogExcerpt}>{b.excerpt}</p>
              <div style={styles.blogMeta}>
                <span>{b.date}</span>
                <span>·</span>
                <span>{b.minutes} min read</span>
              </div>
              <span style={styles.blogReadMore}>Read article →</span>
            </button>
          ))}
        </div>
      </section>

      {/* ─────────────────── FINAL CTA ─────────────────── */}
      <section style={styles.finalCta}>
        <h2 style={styles.finalCtaTitle}>Ready to take your privacy seriously?</h2>
        <p style={styles.finalCtaSub}>
          Free forever. No credit card. No phone number. Your account is bound to nothing but
          an email and a password you control.
        </p>
        <div style={styles.heroCtas}>
          {isAuthenticated ? (
            <button className="btn btn-primary btn-breathe" onClick={() => navigate("/dashboard")}
              style={{ padding: "14px 28px", fontSize: 16 }}>
              Open Your Vault →
            </button>
          ) : (
            <button className="btn btn-primary btn-breathe" onClick={() => navigate("/login?mode=signup")}
              style={{ padding: "14px 28px", fontSize: 16 }}>
              Create your free account →
            </button>
          )}
        </div>
      </section>

      {/* ─────────────────── FOOTER ─────────────────── */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerBrand}>
            <div style={styles.navLogoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <div style={styles.navLogoText}>SecureVault <span style={{ color: "var(--accent-cyan)" }}>AI</span></div>
              <div style={styles.footerTag}>Privacy that doesn't ask for permission.</div>
            </div>
          </div>

          <div style={styles.footerCols}>
            <div style={styles.footerCol}>
              <div style={styles.footerColTitle}>Product</div>
              <a href="#features" style={styles.footerLink}>Features</a>
              <a href="#how"      style={styles.footerLink}>How it works</a>
              <a href="#faq"      style={styles.footerLink}>FAQ</a>
              <a href="#blog"     style={styles.footerLink}>Blog</a>
            </div>
            <div style={styles.footerCol}>
              <div style={styles.footerColTitle}>Account</div>
              {isAuthenticated ? (
                <a onClick={() => navigate("/dashboard")} style={styles.footerLink}>Open vault</a>
              ) : (
                <>
                  <a onClick={() => navigate("/login?mode=signin")} style={styles.footerLink}>Sign in</a>
                  <a onClick={() => navigate("/login?mode=signup")} style={styles.footerLink}>Create account</a>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={styles.footerBottom}>
          <span>© 2026 SecureVault AI. Built with WebCrypto, Firebase, and a healthy distrust of servers.</span>
          <span>v1.0 · {new Date().toLocaleDateString()}</span>
        </div>
      </footer>

      {/* Article modal */}
      {article && (
        <div style={styles.modalBack} onClick={() => setOpenBlog(null)}>
          <article style={styles.modalArticle} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpenBlog(null)} style={styles.modalClose} title="Close (Esc)">
              ✕
            </button>
            <div style={{ ...styles.blogTag, ...accentBg(article.accent), color: `var(--accent-${article.accent})`, alignSelf: "flex-start", marginBottom: 16 }}>
              {article.tag}
            </div>
            <h1 style={styles.modalTitle}>{article.title}</h1>
            <div style={styles.modalMeta}>
              <span>{article.date}</span>
              <span>·</span>
              <span>{article.minutes} min read</span>
            </div>
            <div style={styles.modalBody}>
              {BLOG_BODIES[article.id]?.map((p, i) => (
                <p key={i} style={styles.modalPara}>{p}</p>
              ))}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setOpenBlog(null)} style={styles.modalCloseBtn}>
                ← Back to home
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

/* ────────── Sub-components ────────── */
function WhyCard({ icon, title, text, bad }) {
  return (
    <div className="scroll-fade card-hover"
      style={{ ...styles.whyCard, ...(bad ? styles.whyCardBad : styles.whyCardGood) }}>
      <div style={styles.whyIcon}>{icon}</div>
      <h3 style={styles.whyTitle}>{title}</h3>
      <p style={styles.whyText}>{text}</p>
    </div>
  );
}

function Step({ n, title, text }) {
  return (
    <div className="scroll-fade card-hover" style={styles.step}>
      <div style={styles.stepNum}>{n}</div>
      <h3 style={styles.stepTitle}>{title}</h3>
      <p style={styles.stepText}>{text}</p>
    </div>
  );
}

const accentBorder = (a) => ({ borderColor: `rgba(var(--rgb-${a}, 34, 211, 238), 0.30)` });
const accentBg     = (a) => ({ background:   `var(--accent-${a}-bg, rgba(34,211,238,0.12))` });

/* ────────── Styles ────────── */
const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
    overflow: "hidden",
  },
  gridBg: {
    position: "fixed", inset: 0,
    backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
    backgroundSize: "48px 48px",
    opacity: 0.22,
    pointerEvents: "none",
    zIndex: 0,
    maskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)",
    WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)",
  },
  orb: {
    position: "fixed", width: 560, height: 560, borderRadius: "50%",
    pointerEvents: "none", filter: "blur(30px)", zIndex: 0,
    mixBlendMode: "var(--orb-blend, screen)",
  },

  /* nav */
  nav: {
    position: "sticky", top: 0, zIndex: 100,
    background: "color-mix(in srgb, var(--bg-primary) 78%, transparent)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    borderBottom: "1px solid var(--border)",
  },
  navInner: {
    maxWidth: 1280, margin: "0 auto", padding: "16px 32px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
  },
  navLogo: {
    display: "flex", alignItems: "center", gap: 12,
    textDecoration: "none",
  },
  navLogoIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: "linear-gradient(135deg, rgba(34,211,238,0.14), rgba(167,139,250,0.22))",
    border: "1px solid rgba(34,211,238,0.30)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  navLogoText: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 18, fontWeight: 700,
    color: "var(--text-primary)", letterSpacing: "-0.02em",
  },
  navLinks: { display: "flex", gap: 28 },
  navLink: {
    color: "var(--text-secondary)", textDecoration: "none",
    fontSize: 14, fontWeight: 500, cursor: "pointer",
  },
  navActions: { display: "flex", alignItems: "center", gap: 10 },
  themeBtn: {
    width: 40, height: 40, borderRadius: 10,
    background: "var(--bg-card)", border: "1px solid var(--border-bright)",
    color: "var(--text-primary)", fontSize: 16,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
  },

  /* hero */
  hero: {
    position: "relative", zIndex: 1,
    maxWidth: 980, margin: "0 auto",
    padding: "80px 32px 60px",
    textAlign: "center",
  },
  heroPill: {
    display: "inline-block",
    fontSize: 13, fontWeight: 600,
    color: "var(--accent-cyan)",
    background: "rgba(34,211,238,0.10)",
    border: "1px solid rgba(34,211,238,0.30)",
    padding: "6px 14px", borderRadius: 100,
    marginBottom: 26,
  },
  heroTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 64, fontWeight: 700, letterSpacing: "-0.035em",
    lineHeight: 1.05,
    color: "var(--text-primary)",
    marginBottom: 22,
  },
  gradientText: {
    background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  strikeWord: {
    color: "var(--text-muted)",
    textDecoration: "line-through",
    textDecorationColor: "var(--accent-red)",
    textDecorationThickness: "3px",
  },
  heroSub: {
    fontSize: 19, lineHeight: 1.55,
    color: "var(--text-secondary)",
    maxWidth: 720, margin: "0 auto 36px",
  },
  heroCtas: { display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 },
  guestLink: {
    background: "transparent", border: "none",
    color: "var(--text-secondary)",
    fontSize: 14, fontWeight: 500, cursor: "pointer",
    padding: "10px 14px", marginBottom: 32,
    fontFamily: "Inter, sans-serif",
    textDecoration: "underline",
    textUnderlineOffset: 4,
    textDecorationColor: "var(--text-muted)",
  },

  trustRow: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16, maxWidth: 820, margin: "0 auto",
  },
  trustItem: {
    padding: 16,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--card-shadow)",
  },
  trustLabel: {
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 13, fontWeight: 600,
    color: "var(--accent-cyan)",
    marginBottom: 4,
  },
  trustNote: { fontSize: 12, color: "var(--text-secondary)" },

  /* generic section */
  section: {
    position: "relative", zIndex: 1,
    maxWidth: 1200, margin: "0 auto",
    padding: "80px 32px",
  },
  sectionEyebrow: {
    fontSize: 12, fontWeight: 700, letterSpacing: "0.16em",
    color: "var(--accent-cyan)",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 44, fontWeight: 700, letterSpacing: "-0.025em",
    color: "var(--text-primary)",
    marginBottom: 16,
    maxWidth: 760,
  },
  sectionLead: {
    fontSize: 17, lineHeight: 1.6,
    color: "var(--text-secondary)",
    maxWidth: 720,
    marginBottom: 44,
  },

  /* why grid */
  whyGrid: {
    display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
  },
  whyCard: {
    padding: 28,
    background: "var(--bg-card)",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--card-shadow)",
  },
  whyCardBad: {
    borderColor: "rgba(248,113,113,0.20)",
    background: "linear-gradient(135deg, var(--bg-card), rgba(248,113,113,0.04))",
  },
  whyCardGood: {
    borderColor: "rgba(52,211,153,0.30)",
    background: "linear-gradient(135deg, var(--bg-card), rgba(52,211,153,0.06))",
  },
  whyIcon: { fontSize: 32, marginBottom: 14 },
  whyTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 22, fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 10,
  },
  whyText: { fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary)" },

  /* feature grid */
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 22,
  },
  featureCard: {
    padding: 26,
    background: "var(--bg-card)",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--card-shadow)",
  },
  featureIcon: {
    width: 56, height: 56, borderRadius: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 30, marginBottom: 18,
  },
  featureName: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 20, fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 10,
  },
  featureBlurb: { fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 16 },
  featureBullets: { listStyle: "none", display: "flex", flexDirection: "column", gap: 7 },
  featureBullet: {
    fontSize: 13, color: "var(--text-secondary)",
    display: "flex", gap: 8, lineHeight: 1.5,
  },

  /* steps */
  stepsGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18,
  },
  step: {
    padding: 24,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--card-shadow)",
  },
  stepNum: {
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))",
    color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 20, fontWeight: 800,
    marginBottom: 18,
  },
  stepTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 18, fontWeight: 700,
    color: "var(--text-primary)",
    marginBottom: 8,
  },
  stepText: { fontSize: 14, lineHeight: 1.55, color: "var(--text-secondary)" },

  /* faq */
  faqList: { display: "flex", flexDirection: "column", gap: 10 },
  faqItem: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
    transition: "border-color 0.15s",
    boxShadow: "var(--card-shadow)",
  },
  faqItemOpen: { borderColor: "var(--accent-cyan)" },
  faqQuestion: {
    width: "100%", padding: "20px 24px",
    display: "flex", alignItems: "center", gap: 16,
    background: "transparent", border: "none",
    color: "var(--text-primary)",
    fontSize: 16, fontWeight: 600,
    textAlign: "left", cursor: "pointer",
    fontFamily: "Inter, sans-serif",
  },
  faqToggle: {
    width: 32, height: 32, borderRadius: 8,
    background: "var(--bg-secondary)",
    color: "var(--accent-cyan)",
    fontSize: 18, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  faqAnswer: {
    padding: "0 24px 20px",
    fontSize: 14, lineHeight: 1.7,
    color: "var(--text-secondary)",
  },

  /* blog */
  blogGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
  },
  blogCard: {
    padding: 24,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    display: "flex", flexDirection: "column",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "Inter, sans-serif",
    boxShadow: "var(--card-shadow)",
  },
  blogTag: {
    alignSelf: "flex-start",
    fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
    padding: "4px 10px", borderRadius: 100,
    marginBottom: 14,
  },
  blogTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 18, fontWeight: 700,
    color: "var(--text-primary)",
    lineHeight: 1.35, marginBottom: 10,
  },
  blogExcerpt: { fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", marginBottom: 16 },
  blogMeta: {
    fontSize: 12, color: "var(--text-muted)",
    display: "flex", gap: 6,
    marginBottom: 14, marginTop: "auto",
  },
  blogReadMore: {
    fontSize: 13, fontWeight: 600,
    color: "var(--accent-cyan)", cursor: "pointer",
  },

  /* final cta */
  finalCta: {
    position: "relative", zIndex: 1,
    maxWidth: 820, margin: "0 auto",
    padding: "60px 32px 100px",
    textAlign: "center",
  },
  finalCtaTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 40, fontWeight: 700, letterSpacing: "-0.025em",
    color: "var(--text-primary)",
    marginBottom: 14,
  },
  finalCtaSub: {
    fontSize: 17, lineHeight: 1.55,
    color: "var(--text-secondary)",
    maxWidth: 600, margin: "0 auto 34px",
  },

  /* footer */
  footer: {
    position: "relative", zIndex: 1,
    background: "var(--bg-secondary)",
    borderTop: "1px solid var(--border)",
    padding: "48px 32px 28px",
  },
  footerInner: {
    maxWidth: 1200, margin: "0 auto",
    display: "grid", gridTemplateColumns: "1fr auto", gap: 60,
    alignItems: "start",
  },
  footerBrand: { display: "flex", gap: 14, alignItems: "center" },
  footerTag: { fontSize: 13, color: "var(--text-secondary)", marginTop: 2 },
  footerCols: { display: "flex", gap: 56 },
  footerCol: { display: "flex", flexDirection: "column", gap: 8 },
  footerColTitle: {
    fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
    color: "var(--text-primary)", marginBottom: 6,
  },
  footerLink: {
    fontSize: 13, color: "var(--text-secondary)",
    textDecoration: "none", cursor: "pointer",
  },
  footerBottom: {
    maxWidth: 1200, margin: "32px auto 0", paddingTop: 24,
    borderTop: "1px solid var(--border)",
    display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
    fontSize: 12, color: "var(--text-muted)",
  },

  /* modal */
  modalBack: {
    position: "fixed", inset: 0,
    background: "rgba(5,8,16,0.78)",
    backdropFilter: "blur(8px)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    zIndex: 1000, padding: "60px 20px 40px",
    overflowY: "auto",
    animation: "fadeUp 0.25s ease",
  },
  modalArticle: {
    position: "relative",
    width: "100%", maxWidth: 760,
    background: "var(--bg-card)",
    border: "1px solid var(--border-bright)",
    borderRadius: "var(--radius-xl)",
    padding: "44px 48px 36px",
    boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
  },
  modalClose: {
    position: "absolute", top: 20, right: 20,
    width: 40, height: 40, borderRadius: 10,
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    fontSize: 16, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modalTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 34, fontWeight: 700, letterSpacing: "-0.025em",
    lineHeight: 1.15,
    color: "var(--text-primary)",
    marginBottom: 14,
  },
  modalMeta: {
    display: "flex", gap: 8,
    fontSize: 13, color: "var(--text-muted)",
    marginBottom: 28,
  },
  modalBody: { display: "flex", flexDirection: "column", gap: 18 },
  modalPara: {
    fontSize: 16, lineHeight: 1.75,
    color: "var(--text-primary)",
  },
  modalFooter: {
    marginTop: 32, paddingTop: 24,
    borderTop: "1px solid var(--border)",
  },
  modalCloseBtn: {
    background: "transparent", border: "1.5px solid var(--border-bright)",
    color: "var(--text-secondary)", padding: "10px 18px",
    borderRadius: "var(--radius-md)", cursor: "pointer",
    fontSize: 14, fontWeight: 600, fontFamily: "Inter, sans-serif",
  },
};
