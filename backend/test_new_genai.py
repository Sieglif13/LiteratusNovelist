import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.environ.get('GOOGLE_API_KEY'))

print("Client created")

# Form history using types.Content
history = [
    types.Content(role="user", parts=[types.Part.from_text(text="Hello")]),
    types.Content(role="model", parts=[types.Part.from_text(text="Hi, I am AI.")]),
]

try:
    chat = client.chats.create(
        model="gemini-2.0-flash",
        config=types.GenerateContentConfig(
            system_instruction="You are a helpful assistant.",
            temperature=0.5
        ),
        history=history
    )
    
    response = chat.send_message("What did I say earlier?")
    print("Response:")
    print(response.text)
except Exception as e:
    print("Error:", e)
