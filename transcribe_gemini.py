import argparse
import os
import sys
import time
import json

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Error: The 'google-genai' library is not installed.")
    print("Run: pip install google-genai")
    sys.exit(1)

import webbrowser

CONFIG_DIR = os.path.expanduser("~/.config/rhesis")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")

def setup_wizard(cli_key=None):
    """Handles automatic saving and retrieval of the API Key for the user."""
    if cli_key:
        return cli_key
        
    env_key = os.environ.get("GEMINI_API_KEY")
    if env_key:
        return env_key
        
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                if "api_key" in config and config["api_key"]:
                    return config["api_key"]
        except Exception:
            pass
            
    # Interactive Setup Wizard
    print("="*65)
    print("✨ Welcome to Rhesis! It looks like this is your first run.")
    print("To transcribe hours of audio for free, we use Google AI.")
    print("\nSteps (you only need to do this once):")
    print("1. Opening your browser to the exact page...")
    print("2. Sign in with Google and click the blue 'Create API key' button.")
    print("3. Copy the string and paste it below.")
    print("="*65)
    
    # Automatically open the browser to the exact page
    time.sleep(1.5)
    webbrowser.open("https://aistudio.google.com/app/apikey")
    
    api_key = input("\n🔑 Paste your API Key here: ").strip()
    
    if not api_key:
        print("Error: API Key not provided. Exiting.", file=sys.stderr)
        sys.exit(1)
        
    # Save the key permanently and securely (hidden in the user's home directory)
    try:
        os.makedirs(CONFIG_DIR, exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            json.dump({"api_key": api_key}, f)
        print("\n✅ Key saved successfully and securely on your PC!")
        print("From now on, you can simply run the script and it will work automatically.\n")
    except Exception as e:
        print(f"\n⚠️ Unable to save the key: {e}")
        
    return api_key


def transcribe_audio_gemini(
    audio_path: str,
    api_key: str,
    model_name: str = "gemini-3-flash-preview",
    output_path: str = None,
):
    """Uploads an audio file to Google AI and transcribes it using Gemini."""
    if not os.path.isfile(audio_path):
        print(f"Error: Audio file not found at '{audio_path}'", file=sys.stderr)
        sys.exit(1)

    print("Configuring Google Gemini Client...")
    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Failed to initialize client: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"\nUploading '{audio_path}' to Google servers (this might take a minute for large files)...")
    try:
        uploaded_file = client.files.upload(file=audio_path)
    except Exception as e:
        print(f"Failed to upload file. Error: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"File uploaded successfully as: {uploaded_file.name}")
    print("Checking file processing status...")
    
    try:
        file_info = client.files.get(name=uploaded_file.name)
        while file_info.state == 'PROCESSING':
            print('.', end='', flush=True)
            time.sleep(3)
            file_info = client.files.get(name=uploaded_file.name)
            
        if file_info.state == 'FAILED':
            print("\nError: Google backend failed to process the audio file.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"\nError checking file status: {e}")

    print(f"\nFile is ready. Starting transcription with model: {model_name}")
    
    prompt = (
        "Questa è la trascrizione accurata di una lezione universitaria in italiano. "
        "Vengono usati termini tecnici e accademici. Non inserire i timestamp (minutaggi)."
    )

    max_retries = 3
    transcript_text = ""
    
    for attempt in range(max_retries):
        try:
            print(f"Waiting for the model to generate the transcription... (Attempt {attempt + 1}/{max_retries})")
            response = client.models.generate_content(
                model=model_name,
                contents=[uploaded_file, prompt]
            )
            transcript_text = response.text
            break  
            
        except Exception as e:
            error_msg = str(e)
            
            if "503" in error_msg or "UNAVAILABLE" in error_msg or "high demand" in error_msg:
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 10
                    print(f"Server is currently busy (High Demand). Retrying in {wait_time} seconds...", file=sys.stderr)
                    time.sleep(wait_time)
                    continue
            
            print(f"\nError during transcription generation: {e}", file=sys.stderr)
            sys.exit(1)

    if not output_path:
        base_name = os.path.splitext(audio_path)[0]
        output_path = f"{base_name}_gemini.txt"

    print(f"\n--- Transcription Output ---")
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(transcript_text)
        
    print(f"Transcription completed successfully!")
    print(f"Saved to: '{output_path}'")
    
    try:
        client.files.delete(name=uploaded_file.name)
        print(f"Cleaned up file {uploaded_file.name} from Google servers.")
    except Exception as e:
        print(f"Warning: could not delete file from server: {e}")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Transcribe audio recordings using Google Gemini API."
    )
    parser.add_argument(
        "audio_path",
        type=str,
        help="Path to the input audio file.",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=None,
        help="Optional: Pass the API key directly. Otherwise, the setup wizard will ask for it.",
    )
    parser.add_argument(
        "-m",
        "--model",
        type=str,
        default="gemini-3-flash-preview", 
        help="Gemini model to use.",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=None,
        help="Custom output .txt file path.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    
    # Run the setup wizard to retrieve (or ask for the first time) the key
    api_key = setup_wizard(args.api_key)
    
    transcribe_audio_gemini(
        audio_path=args.audio_path,
        api_key=api_key,
        model_name=args.model,
        output_path=args.output,
    )
