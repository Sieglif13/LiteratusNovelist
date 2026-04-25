import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

models_to_test = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.0-pro',
    'models/gemini-1.5-flash',
    'models/gemini-1.0-pro'
]

print("--- INICIANDO DIAGNÓSTICO DE MODELOS GRATUITOS ---")
for m_name in models_to_test:
    try:
        print(f"Probando {m_name}...", end=" ")
        model = genai.GenerativeModel(m_name)
        response = model.generate_content('hola')
        print(f"✅ ¡FUNCIONA! -> {m_name}")
        # Guardamos el ganador para usarlo en el servidor
        with open('winner_model.txt', 'w') as f:
            f.write(m_name)
        break
    except Exception as e:
        print(f"❌ FALLÓ: {str(e)[:50]}...")

print("--- FIN DEL DIAGNÓSTICO ---")
