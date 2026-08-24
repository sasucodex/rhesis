import sys

with open("/home/samuele/rhesis/frontend/src/App.jsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "const handleDragLeave = () => {" in line:
        new_lines.append(line)
        new_lines.append("    setIsDragging(false)\n")
        new_lines.append("  }\n\n")
        new_lines.append("  const validateAndSetFile = (selectedFile) => {\n")
        new_lines.append("    const allowed = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.mp4', '.webm', '.mpeg', '.mpga', '.amr'];\n")
        new_lines.append("    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();\n")
        new_lines.append("    if (!allowed.includes(ext) && !selectedFile.type.startsWith('audio/')) {\n")
        new_lines.append("      setErrorMsg(`Formato non supportato: \"${ext}\". Inserisci un file audio valido.`);\n")
        new_lines.append("      return;\n")
        new_lines.append("    }\n")
        new_lines.append("    setErrorMsg('');\n")
        new_lines.append("    setFile(selectedFile);\n")
        new_lines.append("    setStatus('idle');\n")
        new_lines.append("  }\n\n")
        new_lines.append("  const handleDrop = (e) => {\n")
        new_lines.append("    e.preventDefault();\n")
        new_lines.append("    setIsDragging(false);\n")
        new_lines.append("    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {\n")
        new_lines.append("      validateAndSetFile(e.dataTransfer.files[0]);\n")
        new_lines.append("    }\n")
        new_lines.append("  }\n\n")
        new_lines.append("  const handleFileSelect = (e) => {\n")
        new_lines.append("    if (e.target.files && e.target.files.length > 0) {\n")
        new_lines.append("      validateAndSetFile(e.target.files[0]);\n")
        new_lines.append("    }\n")
        new_lines.append("  }\n\n")
        continue
        
    # skip the broken lines
    if "setIsDragging(false)" in line and "const handleTranscribe" in lines[lines.index(line)+1] and "const handleDragLeave" in lines[lines.index(line)-1]:
        continue

    new_lines.append(line)

with open("/home/samuele/rhesis/frontend/src/App.jsx", "w") as f:
    f.writelines(new_lines)
