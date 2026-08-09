import os
import tempfile
import yt_dlp
import assemblyai as aai
from app.config import settings

def extract_youtube_audio(youtube_url: str) -> str:
    """
    Extract audio-only track from a YouTube URL using yt-dlp.
    Saves the audio as a temporary .mp3 file and returns the filepath.
    Raises RuntimeError if ffmpeg is missing.
    """
    temp_dir = tempfile.gettempdir()
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(temp_dir, 'rintis_yt_%(id)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            filename = ydl.prepare_filename(info)
            # The FFmpegExtractAudio postprocessor changes the extension to .mp3
            base, _ = os.path.splitext(filename)
            mp3_filename = base + ".mp3"
            
            if os.path.exists(mp3_filename):
                return mp3_filename
            elif os.path.exists(filename):
                return filename
            else:
                raise FileNotFoundError("Audio file not found after download.")
    except Exception as e:
        err_msg = str(e)
        if "ffmpeg" in err_msg.lower() or "ffprobe" in err_msg.lower():
            raise RuntimeError(
                "ffmpeg / ffprobe is not installed in the environment. "
                "Please install ffmpeg on your machine (e.g. via scoop/choco/brew) to run YouTube audio extraction."
            )
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
    config = aai.TranscriptionConfig(language_code="id")

    try:
        transcript = transcriber.transcribe(filepath, config=config)
        if transcript.status == aai.TranscriptStatus.error:
            raise RuntimeError(f"AssemblyAI error: {transcript.error}")
        return transcript.text
    except Exception as e:
        raise RuntimeError(f"AssemblyAI transcription failed: {e}")
