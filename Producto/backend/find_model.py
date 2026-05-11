import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get('GOOGLE_API_KEY')
client = genai.Client(api_key=api_key)

print("Listing models...")
available_models = [m.name for m in client.models.list() if 'gemini' in m.name]
print("Found models:", available_models)

winner = None
for m in available_models:
    # strip models/ prefix inside generative calls if needed, or genai handles it
    model_name = m.replace('models/', '')
    print(f"Testing {model_name}...")
    try:
        response = client.models.generate_content(model=model_name, contents="hi")
        if response.text:
            print(f"✅ Success! Use: {model_name}")
            winner = model_name
            break
    except Exception as e:
        print(f"❌ Failed: {str(e)[:100]}...")

if winner:
    print(f"WINNER_MODEL={winner}")
else:
    print("NO WORKING MODEL FOUND.")
