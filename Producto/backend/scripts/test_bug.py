import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get('GOOGLE_API_KEY')
client = genai.Client(api_key=api_key)

print("Key loaded:", api_key[:5], "...")

def test_model(model_name):
    print(f"Testing {model_name}...")
    try:
        chat = client.chats.create(
            model=model_name,
            config=types.GenerateContentConfig(
                system_instruction="You are testing.",
                temperature=0.5
            )
        )
        response = chat.send_message("Say hi")
        print("Success:", response.text)
    except Exception as e:
        print("Error:", e)

test_model("gemini-1.5-flash")
test_model("gemini-2.0-flash")
