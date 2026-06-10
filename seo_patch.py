#!/usr/bin/env python3
"""
STEELLDY — SEO Meta Tags Patcher
Injecte tous les meta tags SEO critiques dans index.html
"""
import sys

INDEX = r"C:\Users\olegt\steelldy-platform\index.html"

SEO_TAGS = '''
  <!-- ═══ SEO CORE ═══════════════════════════════════════════════ -->
  <meta name="description" content="STEELLDY INDICES — Carbon Credit Quality Index (CCQI) and DeFi Yield Optimization Index (DYOI). Real-time scoring for Pillar Two fiscal resilience, carbon credit quality, and DeFi yield intelligence. Built for institutional investors, ESG managers, and tax directors.">
  <meta name="keywords" content="carbon credit quality index, CCQI, DeFi yield index, DYOI, Pillar Two CCQI, EUA price, carbon credit scoring, tokenized carbon credits, SBCO, GloBE Pillar Two, DeFi yield optimization, carbon market intelligence, ESG index">
  <meta name="robots" content="index, follow">
  <meta name="author" content="STEELLDY">
  <link rel="canonical" href="https://www.steelldy-indices.com/">

  <!-- ═══ OPEN GRAPH (LinkedIn, Facebook) ══════════════════════ -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.steelldy-indices.com/">
  <meta property="og:title" content="STEELLDY INDICES — Carbon Credit Quality & DeFi Yield Intelligence">
  <meta property="og:description" content="Institutional-grade indices for carbon credit quality (CCQI) and DeFi yield optimization (DYOI). Real-time Pillar Two fiscal resilience scoring. From €490/month.">
  <meta property="og:image" content="https://www.steelldy-indices.com/assets/og-image.png">
  <meta property="og:site_name" content="STEELLDY INDICES">
  <meta property="og:locale" content="en_US">

  <!-- ═══ TWITTER / X CARDS ════════════════════════════════════ -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="https://www.steelldy-indices.com/">
  <meta name="twitter:title" content="STEELLDY INDICES — Carbon & DeFi Intelligence">
  <meta name="twitter:description" content="CCQI: Real-time carbon credit quality scoring for Pillar Two compliance. DYOI: DeFi yield optimization across 25 protocols. Institutional grade.">
  <meta name="twitter:image" content="https://www.steelldy-indices.com/assets/og-image.png">

  <!-- ═══ STRUCTURED DATA JSON-LD ══════════════════════════════ -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "name": "STEELLDY INDICES",
    "url": "https://www.steelldy-indices.com",
    "description": "Institutional-grade carbon credit quality index (CCQI) and DeFi yield optimization index (DYOI) for Pillar Two compliance and ESG portfolio management.",
    "serviceType": "Financial Index Provider",
    "areaServed": "Worldwide",
    "offers": [
      {
        "@type": "Offer",
        "name": "DYOI Signal Pack",
        "price": "490",
        "priceCurrency": "EUR",
        "billingIncrement": "P1M",
        "description": "DeFi Yield Optimization Index — 25 protocols, risk-adjusted scoring"
      },
      {
        "@type": "Offer",
        "name": "CCQI Pro",
        "price": "990",
        "priceCurrency": "EUR",
        "billingIncrement": "P1M",
        "description": "Carbon Credit Quality Index with Pillar Two fiscal resilience indicator"
      },
      {
        "@type": "Offer",
        "name": "Full Suite Institutional",
        "price": "1490",
        "priceCurrency": "EUR",
        "billingIncrement": "P1M",
        "description": "Full CCQI + DYOI access with quarterly Pillar Two carbon portfolio assessment"
      }
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "contact@steelldy.com",
      "contactType": "customer service"
    }
  }
  </script>

  <!-- ═══ ADDITIONAL SEO ════════════════════════════════════════ -->
  <meta name="theme-color" content="#03060E">
  <meta name="application-name" content="STEELLDY INDICES">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
'''

path = sys.argv[1] if len(sys.argv) > 1 else INDEX

with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

if 'og:title' in html:
    print("⚠ SEO tags already present — skipping")
else:
    # Insert after <title> tag
    insert_after = '</title>'
    idx = html.find(insert_after)
    if idx == -1:
        insert_after = '<meta name="viewport"'
        idx = html.find(insert_after)
        insert_pos = idx
    else:
        insert_pos = idx + len(insert_after)

    patched = html[:insert_pos] + '\n' + SEO_TAGS + html[insert_pos:]

    with open(path, 'w', encoding='utf-8') as f:
        f.write(patched)
    print(f"✅ SEO tags injected ({len(SEO_TAGS)} chars added)")
    print("   → meta description ✅")
    print("   → Open Graph ✅")
    print("   → Twitter Cards ✅")
    print("   → JSON-LD structured data ✅")
    print("   → canonical URL ✅")
