import os
import tempfile
import yt_dlp
import assemblyai as aai
from app.config import settings

def extract_youtube_audio(youtube_url: str) -> str:
    """
    Extract audio-only track from a YouTube URL using yt-dlp via subprocess.
    Saves the audio as a temporary .mp3 file and returns the filepath.
    Raises RuntimeError if ffmpeg or yt-dlp is missing, or if the download fails.
    """
    import subprocess
    
    temp_dir = tempfile.gettempdir()
    
    # Extract video ID for unique file naming
    video_id = "temp"
    if "v=" in youtube_url:
        video_id = youtube_url.split("v=")[1].split("&")[0]
    elif "youtu.be/" in youtube_url:
        video_id = youtube_url.split("youtu.be/")[1].split("?")[0]
        
    outtmpl = os.path.join(temp_dir, f"rintis_yt_{video_id}.%(ext)s")
    mp3_filename = os.path.join(temp_dir, f"rintis_yt_{video_id}.mp3")
    
    # Pre-clean existing files to avoid clashes
    if os.path.exists(mp3_filename):
        try:
            os.remove(mp3_filename)
        except Exception:
            pass

    cmd = [
        "yt-dlp",
        "-f", "bestaudio/best",
        "-x",
        "--audio-format", "mp3",
        "--audio-quality", "192K",
        "-o", outtmpl,
        youtube_url
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=False)
        
        if res.returncode != 0:
            err_msg = res.stderr or res.stdout or ""
            if "ffmpeg" in err_msg.lower() or "ffprobe" in err_msg.lower():
                raise RuntimeError(
                    "ffmpeg / ffprobe is not installed in the environment. "
                    "Please install ffmpeg on your machine (e.g. via scoop/choco/brew) to run YouTube audio extraction."
                )
            raise RuntimeError(f"yt-dlp download failed (code {res.returncode}): {err_msg.strip()}")
            
        if not os.path.exists(mp3_filename):
            raise FileNotFoundError(f"Extracted audio file not found at expected path: {mp3_filename}")
            
        return mp3_filename
    except FileNotFoundError:
        raise RuntimeError("yt-dlp command line executable is not found in the environment path.")
    except Exception as e:
        raise RuntimeError(f"YouTube audio extraction failed: {e}")

def transcribe_audio_file(filepath: str) -> str:
    """
    Transcribe a local pre-recorded audio file to text using AssemblyAI (language code: id).
    """
    api_key = settings.assemblyai_api_key.strip() if settings.assemblyai_api_key else ""
    if not api_key or api_key.lower() == "mock":
        raise ValueError("ASSEMBLYAI_API_KEY is not configured in .env file.")

    aai.settings.api_key = api_key
    transcriber = aai.Transcriber()
    config = aai.TranscriptionConfig(language_detection=True)

    try:
        transcript = transcriber.transcribe(filepath, config=config)
        if transcript.status == aai.TranscriptStatus.error:
            raise RuntimeError(f"AssemblyAI error: {transcript.error}")
        return transcript.text
    except Exception as e:
        raise RuntimeError(f"AssemblyAI transcription failed: {e}")
