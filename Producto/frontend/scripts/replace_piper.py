import os
print(os.getcwd())
ts_file = 'Producto/frontend/src/app/library/reader/reader.component.ts'
with open(ts_file, 'r', encoding='utf-8') as f:
    ts_code = f.read()

ts_code = ts_code.replace("import { PiperVoiceService } from '../../core/services/piper-voice.service';", "import { KokoroTtsService } from '../../core/services/kokoro-tts.service';")
ts_code = ts_code.replace("public piperVoice = inject(PiperVoiceService);", "public kokoroVoice = inject(KokoroTtsService);")
ts_code = ts_code.replace("'native' | 'pro' | 'piper'", "'native' | 'pro' | 'kokoro'")
ts_code = ts_code.replace("currentAudioMode !== 'piper'", "currentAudioMode !== 'kokoro'")
ts_code = ts_code.replace("currentAudioMode === 'piper'", "currentAudioMode === 'kokoro'")
ts_code = ts_code.replace("piperVoice.isSpeaking$", "kokoroVoice.isSpeaking$")
ts_code = ts_code.replace("piperVoice.currentWordIndex$", "kokoroVoice.currentSentenceIdx$")
ts_code = ts_code.replace("piperVoice.resume()", "kokoroVoice.speak(this.currentChapterPlainText, this.authorAvatar?.id || 1)")
ts_code = ts_code.replace("!(this.piperVoice as any).isReadySubject?.value", "false")
ts_code = ts_code.replace("this.piperVoice.initModel().then(() => {", "if(true){")
ts_code = ts_code.replace("this.piperVoice.speak(this.currentChapterPlainText)", "this.kokoroVoice.speak(this.currentChapterPlainText, this.authorAvatar?.id || 1)")
ts_code = ts_code.replace("this.piperVoice.stop()", "this.kokoroVoice.stop()")
ts_code = ts_code.replace("!this.piperVoice.isReadySubject.value", "false")
ts_code = ts_code.replace("await this.piperVoice.initModel()", "")
ts_code = ts_code.replace("this.piperVoice.speak(text)", "this.kokoroVoice.speak(text, this.chatSession?.avatar_id || this.authorAvatar?.id || 1)")

with open(ts_file, 'w', encoding='utf-8') as f:
    f.write(ts_code)

html_file = 'Producto/frontend/src/app/library/reader/reader.component.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html_code = f.read()

html_code = html_code.replace("currentAudioMode === 'piper'", "currentAudioMode === 'kokoro'")
html_code = html_code.replace("currentAudioMode = 'piper'", "currentAudioMode = 'kokoro'")
html_code = html_code.replace("VOZ LOCAL PIPER TTS", "VOZ PREMIUM AI (KOKORO)")
html_code = html_code.replace("Piper TTS - España", "Kokoro TTS - Voces Ultra Realistas")
html_code = html_code.replace("piperVoice.setVoice", "//")
html_code = html_code.replace("piperVoice.voiceSpeed", "//")
html_code = html_code.replace("piperVoice.", "kokoroVoice.")
html_code = html_code.replace("kokoroVoice.isPaused$", "false") 
html_code = html_code.replace("kokoroVoice.pause()", "kokoroVoice.stop()")

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html_code)

print("Replaced Piper with Kokoro successfully.")
