from xhtml2pdf import pisa

html = "<h1>Test</h1><p>Ecco una trascrizione con caratteri speciali: à è ì ò ù e “virgolette” ed em-dash — e bullet •</p>"
with open("test2.pdf", "wb") as f:
    pisa.CreatePDF(html, dest=f)
print("Success")
