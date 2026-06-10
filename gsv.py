
with open('index.html','r',encoding='utf-8') as f:
    h=f.read()
h=h.replace('</title>','</title>\n  <meta name="google-site-verification" content="xnLM28HjfxPDy4">')
with open('index.html','w',encoding='utf-8') as f:
    f.write(h)
print('OK!')

