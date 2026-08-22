import argparse
import os
import sys
import time

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Error: The 'google-genai' library is not installed.")
    print("Run: pip install google-genai")
    sys.exit(1)


def transcribe_audio_gemini(
    audio_path: str,
    api_key: str,
    model_name: str = "gemini-1.5-pro",
    output_path: str = None,
):
    """Uploads an audio file to Google AI and transcribes it using Gemini (new SDK)."""
    if not os.path.isfile(audio_path):
        print(f"Error: Audio file not found at '{audio_path}'", file=sys.stderr)
        sys.exit(1)

    print("Configuring Google Gemini Client...")
    try:
        # Initialize the new SDK client
        client = genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Failed to initialize client: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"\nUploading '{audio_path}' to Google servers (this might take a minute for large files)...")
    try:
        # Upload using the new SDK syntax
        uploaded_file = client.files.upload(file=audio_path)
    except Exception as e:
        print(f"Failed to upload file. Make sure your API key is correct. Error: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"File uploaded successfully as: {uploaded_file.name}")
    print("Checking file processing status...")
    
    # Wait for the file to be processed by Google's backend
    try:
        file_info = client.files.get(name=uploaded_file.name)
        while file_info.state == 'PROCESSING':
            print('.', end='', flush=True)
            time.sleep(3)
            # Refresh the file status
            file_info = client.files.get(name=uploaded_file.name)
            
        if file_info.state == 'FAILED':
            print("\nError: Google backend failed to process the audio file.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"\nError checking file status: {e}")
        # Proceed anyway in case state checking fails but file is actually ready

    print(f"\nFile is ready. Starting transcription with model: {model_name}")
    
    # The prompt used in our very first local script (transcribe.py)
    prompt = (
        "Questa è la trascrizione accurata di una lezione universitaria in italiano. "
        "Vengono usati termini tecnici e accademici."
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
            break  # Success, exit the retry loop
            
        except Exception as e:
            error_msg = str(e)
            
            # Handle temporary 503 overload errors
            if "503" in error_msg or "UNAVAILABLE" in error_msg or "high demand" in error_msg:
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 10
                    print(f"Server is currently busy (High Demand). Retrying in {wait_time} seconds...", file=sys.stderr)
                    time.sleep(wait_time)
                    continue
            
            # For all other errors, or if we run out of retries
            print(f"\nError during transcription generation: {e}", file=sys.stderr)
            if "404" in error_msg or "NOT_FOUND" in error_msg:
                print("\nThe model name you used might be deprecated or invalid for your API key.", file=sys.stderr)
                print("Let's fetch the list of valid models you can use:", file=sys.stderr)
                try:
                    available = []
                    for m in client.models.list():
                        if "generateContent" in m.supported_actions and "gemini" in m.name:
                            available.append(m.name.replace("models/", ""))
                    print(f"Valid models for your account: {', '.join(available)}", file=sys.stderr)
                    print("\nPlease run the command again adding `-m [MODEL_NAME]` from the list above.", file=sys.stderr)
                    print("For example: -m gemini-2.0-flash", file=sys.stderr)
                except Exception as e2:
                    print(f"Could not fetch models: {e2}", file=sys.stderr)
            sys.exit(1)

    # Determine default output file path if not provided
    if not output_path:
        base_name = os.path.splitext(audio_path)[0]
        output_path = f"{base_name}_gemini.txt"

    print(f"\n--- Transcription Output ---")
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(transcript_text)
        
    print(f"Transcription completed successfully!")
    print(f"Saved to: '{output_path}'")
    
    # Clean up the file from Google servers to preserve quota
    try:
        client.files.delete(name=uploaded_file.name)
        print(f"Cleaned up file {uploaded_file.name} from Google servers.")
    except Exception as e:
        print(f"Warning: could not delete file from server: {e}")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Transcribe audio recordings using Google Gemini API (New SDK)."
    )
    parser.add_argument(
        "audio_path",
        type=str,
        help="Path to the input audio file.",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=os.environ.get("GEMINI_API_KEY"),
        help="Your Google AI Studio API key.",
    )
    parser.add_argument(
        "-m",
        "--model",
        type=str,
        default="gemini-3-flash-preview", # Updated default to the model preferred by the user
        help="Gemini model to use. Defaults to 'gemini-3-flash-preview'.",
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
    
    if not args.api_key:
        print("Error: You must provide a Gemini API Key.", file=sys.stderr)
        print("Either pass it with --api-key YOUR_KEY or set the GEMINI_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)
        
    transcribe_audio_gemini(
        audio_path=args.audio_path,
        api_key=args.api_key,
        model_name=args.model,
        output_path=args.output,
    )
