from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Helvetica", size=12)
html = "<h1>Test</h1><p>Ecco una trascrizione con caratteri speciali: à è ì ò ù e “virgolette”</p>"
pdf.write_html(html)
pdf.output("test.pdf")
print("Success")
